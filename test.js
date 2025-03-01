Бот запущен!
Отсортированные игроки: [
  {
    id: 312571900,
    name: 'Павел Солнцев',
    username: '@pavelsolnsev',
    goals: 0,
    gamesPlayed: 15,
    wins: 7,
    draws: 5,
    losses: 3,
    rating: '26.00'
  },
  {
    id: 5124368622,
    name: 'Max Rakhmankin',
    username: '@umeprel',
    goals: 0,
    gamesPlayed: 10,
    wins: 3,
    draws: 4,
    losses: 3,
    rating: '11.50'
  }
]
Ошибка при обновлении сообщения: TelegramError: 400: Bad Request: message is not modif
ied: specified new message content and reply markup are exactly the same as a current 
content and reply markup of the message
    at Telegram.callApi (E:\Web\telegram-bot\node_modules\telegraf\lib\core\network\cl
ient.js:315:19)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)     
    at async E:\Web\telegram-bot\buttons\reshuffle_callback.js:40:7
    at async execute (E:\Web\telegram-bot\node_modules\telegraf\lib\composer.js:518:17
)
    at async E:\Web\telegram-bot\node_modules\telegraf\lib\composer.js:519:21
    at async execute (E:\Web\telegram-bot\node_modules\telegraf\lib\composer.js:518:17
)
    at async E:\Web\telegram-bot\node_modules\telegraf\lib\composer.js:519:21
    at async execute (E:\Web\telegram-bot\node_modules\telegraf\lib\composer.js:518:17
)
    at async E:\Web\telegram-bot\node_modules\telegraf\lib\composer.js:519:21
    at async execute (E:\Web\telegram-bot\node_modules\telegraf\lib\composer.js:518:17
) {
  response: {
    ok: false,
    error_code: 400,
    description: 'Bad Request: message is not modified: specified new message content 
and reply markup are exactly the same as a current content and reply markup of the mes
sage'
  },
  on: {
    method: 'editMessageText',
    payload: {
      reply_markup: [Object],
      text: '� <b>Составы команд (перемешаны) �:</b>\n' +
        '\n' +
        '� <b>Команда 1:</b> (W: 0, D: 0, L: 0, Games: 0)\n' +
        '� <b>Команда 1:</b> (W: 0, D: 0, L: 0, Games: 0)\n'
 +
        '1. Павел Солнцев (@pavelsolnsev) - ⭐26.00\n' +
        '\n' +
        '� <b>Команда 2:</b> (W: 0, D: 0, L: 0, Games: 0)\n'
 +
        '1. Max Rakhmankin (@umeprel) - ⭐11.50\n' +
        '\n'
    }
  }
}
Отсортированные игроки: [
  {
    id: 312571900,
    name: 'Павел Солнцев',
    username: '@pavelsolnsev',
    goals: 0,
    gamesPlayed: 15,
    wins: 7,
    draws: 5,
    losses: 3,
    rating: '26.00'
  },
  {
    id: 5124368622,
    name: 'Max Rakhmankin',
    username: '@umeprel',
    goals: 0,
    gamesPlayed: 10,
    wins: 3,
    draws: 4,
    losses: 3,
    rating: '11.50'
  }
]

pavel@LAPTOP-137C7S94 MINGW64 /e/Web/telegram-bot (main)     
$ node app.js
Бот запущен!

pavel@LAPTOP-137C7S94 MINGW64 /e/Web/telegram-bot (main)     
$ node app.js
Бот запущен!
Unhandled error while processing {
  update_id: 863707707,
  message: {
    message_id: 9874,
    from: {
      id: 312571900,
      is_bot: false,
      first_name: 'Павел',
      last_name: 'Солнцев',
      username: 'pavelsolnsev',
      language_code: 'en'
    },
    chat: {
      id: -1002341289414,
      title: 'Футбол в Раменском | Открытые игры для всех �  
⚽',
      username: 'football_ramenskoe',
      type: 'supergroup'
    },
    date: 1740848029,
    text: 'next'
  }
}
E:\Web\telegram-bot\commands\finish.js:196
        .sort((a, b) => teamStats[team${a + 1}].games - tea
mStats[team${b + 1}].games);
                                                  ^

TypeError: Cannot read properties of undefined (reading 'game
s')
    at E:\Web\telegram-bot\commands\finish.js:196:51
    at Array.sort (<anonymous>)
    at E:\Web\telegram-bot\commands\finish.js:196:10
    at process.processTicksAndRejections (node:internal/proce
ss/task_queues:95:5)
    at async execute (E:\Web\telegram-bot\node_modules\telegr
af\lib\composer.js:518:17)
    at async E:\Web\telegram-bot\node_modules\telegraf\lib\co
mposer.js:519:21
    at async execute (E:\Web\telegram-bot\node_modules\telegr
af\lib\composer.js:518:17)
    at async E:\Web\telegram-bot\node_modules\telegraf\lib\co
mposer.js:519:21
    at async execute (E:\Web\telegram-bot\node_modules\telegr
    at async execute (E:\Web\telegram-bot\node_modules\telegr
af\lib\composer.js:518:17)
    at async E:\Web\telegram-bot\node_modules\telegraf\lib\co
mposer.js:519:21

const { Markup } = require("telegraf");
const { buildTeamsMessage } = require("../message/buildTeamsMessage");
const { buildPlayingTeamsMessage } = require("../message/buildPlayingTeamsMessage");
const { createTeamButtons } = require("../buttons/createTeamButtons");
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");

// Вспомогательные функции
const checkAdminRights = async (ctx, ADMIN_ID) => {
  await ctx.deleteMessage().catch(() => {});
  if (ctx.from.id !== ADMIN_ID) {
    const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
    deleteMessageAfterDelay(ctx, message.message_id);
    return false;
  }
  return true;
};

const checkMatchStarted = async (ctx, isMatchStarted) => {
  if (!isMatchStarted) {
    const message = await ctx.reply("⚠️ Матч не начат!");
    deleteMessageAfterDelay(ctx, message.message_id);
    return false;
  }
  return true;
};

const getMatchResult = (team1, team2) => {
  const team1Goals = team1.reduce((sum, player) => sum + (player.goals || 0), 0);
  const team2Goals = team2.reduce((sum, player) => sum + (player.goals || 0), 0);
  return team1Goals > team2Goals ? "team1" : team1Goals < team2Goals ? "team2" : "draw";
};

const updateTeamStats = (teamStats, teamKey, isWin, isDraw) => {
  if (!teamStats[teamKey]) {
    teamStats[teamKey] = { wins: 0, losses: 0, draws: 0, games: 0, consecutiveWins: 0 };
  }
  teamStats[teamKey].games += 1;
  if (isWin) {
    teamStats[teamKey].wins += 1;
    teamStats[teamKey].consecutiveWins += 1;
  } else {
    teamStats[teamKey].consecutiveWins = 0;
  }
  if (!isWin && !isDraw) teamStats[teamKey].losses += 1;
  if (isDraw) teamStats[teamKey].draws += 1;
};

const updatePlayerStats = (team, originalTeam, isWin, isDraw, isLose) => {
  return team.map((player, index) => {
    const goals = player.goals || 0;
    const originalPlayer = originalTeam[index] || {};
    const totalGoals = (originalPlayer.goals || 0) + goals;
    let rating = originalPlayer.rating || 0;
    rating += goals * 0.5 + (isWin ? 3 : isDraw ? 1 : isLose ? -1.5 : 0);

    return {
      ...originalPlayer,
      name: player.name,
      username: player.username,
      gamesPlayed: (originalPlayer.gamesPlayed || 0) + 1,
      wins: (originalPlayer.wins || 0) + (isWin ? 1 : 0),
      draws: (originalPlayer.draws || 0) + (isDraw ? 1 : 0),
      losses: (originalPlayer.losses || 0) + (isLose ? 1 : 0),
      goals: totalGoals,
      rating,
    };
  });
};

const updateTeamsMessage = async (ctx, GlobalState, allTeamsBase, teamStats) => {
  const updatedMessage = buildTeamsMessage(allTeamsBase, "Составы команд после матча", teamStats);
  const lastTeamsMessage = GlobalState.getLastTeamsMessageId();
  if (lastTeamsMessage) {
    await ctx.telegram.editMessageText(
      lastTeamsMessage.chatId,
      lastTeamsMessage.messageId,
      null,
      updatedMessage,
      { parse_mode: "HTML" }
    );
  } else {
    const sentMessage = await ctx.reply(updatedMessage, { parse_mode: "HTML" });
    GlobalState.setLastTeamsMessageId(ctx.chat.id, sentMessage.message_id);
  }
};

module.exports = (bot, GlobalState) => {
  bot.hears(/^fin$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    if (!await checkAdminRights(ctx, ADMIN_ID)) return;
    if (!await checkMatchStarted(ctx, GlobalState.getStart())) return;

    const playingTeams = GlobalState.getPlayingTeams();
    if (!playingTeams) return ctx.reply("⛔ Нет активного матча!");

    const { team1, team2, teamIndex1, teamIndex2 } = playingTeams;
    let allTeams = GlobalState.getTeams();
    const teamStats = GlobalState.getTeamStats();
    const result = getMatchResult(team1, team2);

    updateTeamStats(teamStats, team${teamIndex1 + 1}, result === "team1", result === "draw");
    updateTeamStats(teamStats, team${teamIndex2 + 1}, result === "team2", result === "draw");

    allTeams[teamIndex1] = updatePlayerStats(team1, allTeams[teamIndex1], result === "team1", result === "draw", result === "team2");
    allTeams[teamIndex2] = updatePlayerStats(team2, allTeams[teamIndex2], result === "team2", result === "draw", result === "team1");

    GlobalState.setTeams(allTeams);
    GlobalState.setTeamStats(teamStats);
    GlobalState.setPlayingTeams(null);

    // Обновляем сообщение о текущем матче с финальным статусом и счетом
    const finishedMessage = buildPlayingTeamsMessage(team1, team2, teamIndex1, teamIndex2, 'finished');
    const playingTeamsMessage = GlobalState.getPlayingTeamsMessageId();
    if (playingTeamsMessage) {
      await ctx.telegram.editMessageText(
        playingTeamsMessage.chatId,
        playingTeamsMessage.messageId,
        null,
        finishedMessage,
        { parse_mode: "HTML" }
      );
    }

    await updateTeamsMessage(ctx, GlobalState, GlobalState.getTeamsBase(), teamStats);

    const notificationMessage = await ctx.reply("✅ Матч завершен, статистика обновлена!");
    deleteMessageAfterDelay(ctx, notificationMessage.message_id);
  });

  bot.hears(/^next$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    if (!await checkAdminRights(ctx, ADMIN_ID)) return;
    if (!await checkMatchStarted(ctx, GlobalState.getStart())) return;

    const playingTeams = GlobalState.getPlayingTeams();
    if (!playingTeams) return ctx.reply("⛔ Нет активного матча для продолжения!");

    const { team1, team2, teamIndex1, teamIndex2 } = playingTeams;
    let allTeams = GlobalState.getTeams();
    const teamStats = GlobalState.getTeamStats();
    const result = getMatchResult(team1, team2);

    // Обновляем статистику предыдущего матча
    updateTeamStats(teamStats, team${teamIndex1 + 1}, result === "team1", result === "draw");
    updateTeamStats(teamStats, team${teamIndex2 + 1}, result === "team2", result === "draw");

    allTeams[teamIndex1] = updatePlayerStats(team1, allTeams[teamIndex1], result === "team1", result === "draw", result === "team2");
    allTeams[teamIndex2] = updatePlayerStats(team2, allTeams[teamIndex2], result === "team2", result === "draw", result === "team1");

    GlobalState.setTeams(allTeams);
    GlobalState.setTeamStats(teamStats);

    // Обновляем сообщение предыдущего матча с финальным статусом
    const finishedMessage = buildPlayingTeamsMessage(team1, team2, teamIndex1, teamIndex2, 'finished');
    const playingTeamsMessage = GlobalState.getPlayingTeamsMessageId();
    if (playingTeamsMessage) {
      await ctx.telegram.editMessageText(
        playingTeamsMessage.chatId,
        playingTeamsMessage.messageId,
        null,
        finishedMessage,
        { parse_mode: "HTML" }
      );
    }

    await updateTeamsMessage(ctx, GlobalState, GlobalState.getTeamsBase(), teamStats);

    const totalTeams = allTeams.length;
    if (totalTeams <= 2) {
      GlobalState.setPlayingTeams(null);
      return ctx.reply("⛔ Недостаточно команд для следующего матча!");
    }

    const resetGoals = (team) => team.map(player => ({ ...player, goals: 0 }));
    let nextTeamIndex1, nextTeamIndex2;

    // Логика выбора следующих команд (оставляем как было)
    if (totalTeams === 3) {
      if (result === "team1") {
        nextTeamIndex1 = teamStats[team${teamIndex1 + 1}].consecutiveWins >= 3 ? teamIndex2 : teamIndex1;
        nextTeamIndex2 = teamStats[team${teamIndex1 + 1}].consecutiveWins >= 3
          ? [0, 1, 2].find(i => i !== teamIndex1 && i !== teamIndex2)
          : [0, 1, 2].find(i => i !== teamIndex1 && i !== teamIndex2);
      } else if (result === "team2") {
        nextTeamIndex1 = teamStats[team${teamIndex2 + 1}].consecutiveWins >= 3 ? teamIndex1 : teamIndex2;
        nextTeamIndex2 = teamStats[team${teamIndex2 + 1}].consecutiveWins >= 3
          ? [0, 1, 2].find(i => i !== teamIndex1 && i !== teamIndex2)
          : [0, 1, 2].find(i => i !== teamIndex1 && i !== teamIndex2);
      } else {
        nextTeamIndex1 = teamStats[team${teamIndex1 + 1}].games <= teamStats[team${teamIndex2 + 1}].games ? teamIndex1 : teamIndex2;
        nextTeamIndex2 = [0, 1, 2].find(i => i !== teamIndex1 && i !== teamIndex2);
      }
    } else {
      const availableTeams = allTeams.map((_, i) => i)
        .filter(i => i !== teamIndex1 && i !== teamIndex2)
        .sort((a, b) => teamStats[team${a + 1}].games - teamStats[team${b + 1}].games);

      if (result === "team1") {
        nextTeamIndex1 = teamStats[team${teamIndex1 + 1}].consecutiveWins >= 3 ? availableTeams[0] : teamIndex1;
        nextTeamIndex2 = teamStats[team${teamIndex1 + 1}].consecutiveWins >= 3 ? availableTeams[1] : availableTeams[0];
      } else if (result === "team2") {
        nextTeamIndex1 = teamStats[team${teamIndex2 + 1}].consecutiveWins >= 3 ? availableTeams[0] : teamIndex2;
        nextTeamIndex2 = teamStats[team${teamIndex2 + 1}].consecutiveWins >= 3 ? availableTeams[1] : availableTeams[0];
      } else {
        nextTeamIndex1 = availableTeams[0];
        nextTeamIndex2 = availableTeams[1];
      }
    }

    const team1Next = resetGoals(allTeams[nextTeamIndex1]);
    const team2Next = resetGoals(allTeams[nextTeamIndex2]);

    // Создаем новое сообщение для нового матча
    const teamsMessage = buildPlayingTeamsMessage(team1Next, team2Next, nextTeamIndex1, nextTeamIndex2, 'playing');
    const sentMessage = await ctx.reply(teamsMessage, {
      parse_mode: "HTML",
      reply_markup: Markup.inlineKeyboard([
        ...createTeamButtons(team1Next, nextTeamIndex1),
        ...createTeamButtons(team2Next, nextTeamIndex2),
      ]).reply_markup,
    });

    GlobalState.setPlayingTeamsMessageId(sentMessage.chat.id, sentMessage.message_id);
    GlobalState.setPlayingTeams({ 
      team1: team1Next, 
      team2: team2Next, 
      teamIndex1: nextTeamIndex1, 
      teamIndex2: nextTeamIndex2 
    });

    const notificationMessage = await ctx.reply(🏀 Автоматически начат новый матч: Команда ${nextTeamIndex1 + 1} vs Команда ${nextTeamIndex2 + 1});
    deleteMessageAfterDelay(ctx, notificationMessage.message_id);
  });
};

когда 4 команды после команды next повляется ошибка которую я написал выше 
исправь код