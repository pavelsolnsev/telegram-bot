const GlobalState = (() => {
  const ADMIN_ID = Number(process.env.ADMIN_ID);
  const GROUP_ID = Number(process.env.ID);
  const IMAGE_URL = process.env.IMAGE_URL;

  let isMatchStarted = false;
  let MAX_PLAYERS = 14;
  let players = [];
  let queue = [];
  let teams = [];
  let collectionDate = null;
  let notificationSent = false;
  let listMessageId = null;
  let location = 'Локации нету';
  let lastTeamCount = null;
  let lastTeamsMessage = null;
  let playingTeams = null;
  let playingTeamsMessageId = null;

  // Новая глобальная переменная для статистики команд
  let teamStats = {};

  const Store = {
    getAdminId: () => ADMIN_ID,
    getGroupId: () => GROUP_ID,
    getStart: () => isMatchStarted,
    setStart: (status) => isMatchStarted = status,
    getMaxPlayers: () => MAX_PLAYERS,
    setMaxPlayers: (number) => MAX_PLAYERS = number,
    getPlayers: () => players,
    setPlayers: (array) => players = array,
    getQueue: () => queue,
    setQueue: (array) => queue = array,
    getCollectionDate: () => collectionDate,
    setCollectionDate: (date) => collectionDate = date,
    getLocation: () => location,
    setLocation: (string) => location = string,
    getNotificationSent: () => notificationSent,
    setNotificationSent: (status) => notificationSent = status,
    getListMessageId: () => listMessageId,
    setListMessageId: (id) => listMessageId = id,
    getIMAGE_URL: () => IMAGE_URL,
    setIMAGE_URL: (url) => IMAGE_URL = url,
    getTeams: () => teams,
    setTeams: (newTeams) => teams = newTeams,
    getLastTeamCount: () => lastTeamCount,
    setLastTeamCount: (num) => lastTeamCount = num,

    setLastTeamsMessageId: (chatId, messageId) => {
      lastTeamsMessage = { chatId, messageId };
    },
    getLastTeamsMessageId: () => lastTeamsMessage,

    setPlayingTeams: (newPlayingTeams) => {
      playingTeams = newPlayingTeams;
    },
    getPlayingTeams: () => playingTeams,

    setPlayingTeamsMessageId: (chatId, messageId) => {
      playingTeamsMessageId = { chatId, messageId };
    },
    getPlayingTeamsMessageId: () => playingTeamsMessageId,

    // Геттер и сеттер для статистики команд
    getTeamStats: () => teamStats,
    setTeamStats: (stats) => teamStats = stats,
  };

  return Object.freeze(Store);
})();

module.exports = { GlobalState };


const buildTeamsMessage = (teams, title = "Составы команд", teamStats = {}) => {
  let message = `🏆 <b>${title}:</b>\n\n`;
  teams.forEach((team, index) => {
    const teamKey = `team${index + 1}`;
    const stats = teamStats[teamKey] || { wins: 0, losses: 0, draws: 0, games: 0 };
    message += `⚽ <b>Команда ${index + 1}:</b> (W: ${stats.wins}, D: ${stats.draws}, L: ${stats.losses}, Games: ${stats.games})\n`;
    team.forEach((player, i) => {
      const goalsText = player.goals && player.goals > 0 ? ` - Голы: ${player.goals}` : "";
      message += `${i + 1}. ${player.name} ${player.username ? `(@${player.username})` : ""}${goalsText}\n`;
    });
    message += "\n";
  });
  return message;
};

module.exports = { buildTeamsMessage };

// Функция создания сообщения с играющими командами
const buildPlayingTeamsMessage = (team1, team2, teamIndex1, teamIndex2) => {
  let message = "🔥 Играют следующие команды:\n\n";
  message += `<b>Команда ${teamIndex1 + 1}:</b>\n`;
  team1.forEach((player, index) => {
    message += `${index + 1}. ${player.name} (${player.username || "Без username"}) - Голы: ${player.goals || 0}\n`;
  });
  message += `\n<b>Команда ${teamIndex2 + 1}:</b>\n`;
  team2.forEach((player, index) => {
    message += `${index + 1}. ${player.name} (${player.username || "Без username"}) - Голы: ${player.goals || 0}\n`;
  });
  return message;
};

module.exports = { buildPlayingTeamsMessage };


const { Markup } = require("telegraf");

const { buildPlayingTeamsMessage } = require("../message/buildPlayingTeamsMessage");
const { createTeamButtons } = require("../buttons/createTeamButtons");

module.exports = (bot, GlobalState) => {
  // Обработка команды для начала игры
  bot.hears(/^play (\d+) (\d+)$/, async (ctx) => {
    const teamIndex1 = parseInt(ctx.match[1], 10) - 1;
    const teamIndex2 = parseInt(ctx.match[2], 10) - 1;
    const teams = GlobalState.getTeams();
  
    if (!teams[teamIndex1] || !teams[teamIndex2]) {
      const message = await ctx.reply("⛔ Команды не найдены!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }
  
    // Очищаем голы перед каждым новым матчем
    const resetGoals = (team) => team.map(player => ({
      ...player,
      goals: 0, // Сбрасываем голы
    }));
  
    const team1 = resetGoals(teams[teamIndex1]);
    const team2 = resetGoals(teams[teamIndex2]);
  
    const teamsMessage = buildPlayingTeamsMessage(team1, team2, teamIndex1, teamIndex2);
  
    const sentMessage = await ctx.reply(teamsMessage, {
      parse_mode: "HTML",
      reply_markup: Markup.inlineKeyboard([
        ...createTeamButtons(team1, teamIndex1),
        ...createTeamButtons(team2, teamIndex2),
      ]).reply_markup,
    });
  
    // Сохраняем ID сообщения с играющими командами
    GlobalState.setPlayingTeamsMessageId(sentMessage.chat.id, sentMessage.message_id);
  
    // Сохраняем текущие играющие команды
    GlobalState.setPlayingTeams({
      team1,
      team2,
      teamIndex1,
      teamIndex2,
    });
  });
  
};

// Подключаем функцию, которая обновляет сообщение с информацией об играющих командах
const { updatePlayingTeamsMessage } = require("../message/updatePlayingTeamsMessage");

// Подключаем функцию, которая может удалить сообщение через какое-то время
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");

// Делаем так, чтобы этот код можно было использовать в других файлах, передаем ему бота и "коробку" с данными игры
module.exports = (bot, GlobalState) => {
  // Учим бота реагировать на команды вроде "goal_1_2" (где числа — это команда и игрок)
  bot.action(/goal_(\d+)_(\d+)/, async (ctx) => {
    const teamIndex = parseInt(ctx.match[1], 10);
    const playerIndex = parseInt(ctx.match[2], 10);
    const playingTeams = GlobalState.getPlayingTeams();
  
    if (!playingTeams) {
      return ctx.answerCbQuery("⛔ Нет активного матча!");
    }
  
    let team;
    if (teamIndex === playingTeams.teamIndex1) {
      team = playingTeams.team1;
    } else if (teamIndex === playingTeams.teamIndex2) {
      team = playingTeams.team2;
    } else {
      return ctx.answerCbQuery("⛔ Команда не найдена!");
    }
  
    if (!team[playerIndex]) {
      return ctx.answerCbQuery("⛔ Игрок не найден!");
    }
  
    team[playerIndex].goals += 1;
    GlobalState.setPlayingTeams(playingTeams);
  
    await updatePlayingTeamsMessage(ctx);
  
    const message = await ctx.reply(`⚽ Гол добавлен для ${team[playerIndex].name}! Теперь у него ${team[playerIndex].goals} гол(ов) в этом матче.`);
    return deleteMessageAfterDelay(ctx, message.message_id);
  });
  
};


const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay"); // Импорт функции для удаления сообщений с задержкой

module.exports = (bot, GlobalState) => {
  bot.hears(/^e!$/i, async (ctx) => {
    // Удаляем сообщение с командой
		const listMessageId = GlobalState.getListMessageId();
		const isMatchStarted = GlobalState.getStart(); // Проверяем, начат ли матч
		const ADMIN_ID = GlobalState.getAdminId(); // Получаем ID администратора

    await ctx.deleteMessage().catch(() => {});

   if (!isMatchStarted) return; // Если матч не начался, выходим из функции
		
		if (ctx.from.id !== ADMIN_ID) { // Проверяем, является ли отправитель администратором
			const message = await ctx.reply("⛔ У вас нет прав для этой команды."); // Отправляем сообщение о запрете
			return deleteMessageAfterDelay(ctx, message.message_id); // Удаляем сообщение через некоторое время
		}

    // Удаляем сообщение со списком игроков, если оно существует
    if (listMessageId) {
      await ctx.telegram
        .deleteMessage(ctx.chat.id, listMessageId)
        .catch(() => {});
      GlobalState.setListMessageId(null);
    }

    // Сбрасываем все игровые данные
    GlobalState.setPlayers([]); // Очистка списка игроков
    GlobalState.setQueue([]); // Очистка очереди
    GlobalState.setCollectionDate(null); // Удаление даты сбора
    GlobalState.setLocation("Локация пока не определена"); // Сброс локации
    GlobalState.setMaxPlayers(14); // Возвращаем стандартное значение максимальных игроков
    GlobalState.setStart(false); // Завершаем матч
    GlobalState.setNotificationSent(false); // Сбрасываем флаг отправки уведомлений

    // Отправляем подтверждающее сообщение
    const message = await ctx.reply(
      "✅ Сбор успешно завершён!"
    );
    deleteMessageAfterDelay(ctx, message.message_id);
  });
};

у меня есть команда которая заканчивает матч e!
она дожна полностью все отчищать чтобы все команды play fin и так далее работали по новой c с новыми данными 
но статистику играков она дожна запомнить и где-то зафиксировать 
я эту статистику будут отправлять на бэк чтобы из бэка потом я мог подтягивать эту стату для играков