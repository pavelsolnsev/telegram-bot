const { deleteMessageAfterDelay } = require('../utils/deleteMessageAfterDelay');
const { sendPlayerList } = require('../utils/sendPlayerList');
const { sendPrivateMessage } = require('../message/sendPrivateMessage');
const { safeTelegramCall } = require('../utils/telegramUtils');
const { safeAnswerCallback } = require('../utils/safeAnswerCallback');
const getPlayerStats = require('../database/getPlayerStats');
const getPlayerByName = require('../database/getPlayerByName');

// Функция для проверки наличия эмодзи или Unicode-символов
const containsEmojiOrUnicode = (text) => {
  // Проверяем на:
  // - Эмодзи (1F000-1FFFF)
  // - Математические алфавитные символы (1D400-1D7FF) - декоративные буквы
  // - Полноширинные символы (FF00-FFEF)
  // - Различные Unicode диапазоны с декоративными символами
  // eslint-disable-next-line no-misleading-character-class
  const emojiUnicodeRegex = /[\u{1F000}-\u{1FFFF}\u{1D400}-\u{1D7FF}\u{2000}-\u{2FFF}\u{3000}-\u{3FFF}\u{FF00}-\u{FFEF}\u{FE00}-\u{FEFF}]/u;
  return emojiUnicodeRegex.test(text);
};

// Функция для удаления эмодзи и декоративных Unicode-символов из строки
const removeEmoji = (text) => {
  if (!text || typeof text !== 'string') return text;
  // Удаляем:
  // - Эмодзи (1F000-1FFFF, 2600-27BF, FE00-FEFF, 1F600-1F64F, 1F680-1F6FF, 1F900-1F9FF)
  // - Математические алфавитные символы (1D400-1D7FF) - декоративные буквы
  // - Полноширинные символы (FF00-FFEF)
  // eslint-disable-next-line no-misleading-character-class
  const emojiRegex = /[\u{1F000}-\u{1FFFF}\u{1D400}-\u{1D7FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FEFF}\u{FF00}-\u{FFEF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/gu;
  return text.replace(emojiRegex, '').trim();
};

// Функция для очистки имени игрока от эмодзи с проверкой результата
const cleanPlayerName = (name, username) => {
  const cleanName = name ? removeEmoji(String(name)) : '';
  const cleanUsername = username ? removeEmoji(String(username)) : '';

  // Если после очистки оба поля пустые - возвращаем null (запрет входа)
  if (!cleanName && !cleanUsername) {
    return { name: null, username: null, allowed: false };
  }

  // Используем очищенные значения или fallback
  const finalName = cleanName || cleanUsername || null;
  const finalUsername = cleanUsername || (cleanName ? null : null);

  return {
    name: finalName,
    username: finalUsername,
    allowed: true,
  };
};

// Функция для проверки и создания объекта пользователя
const validateAndCreateUser = async (ctx, GlobalState) => {
  const GROUP_ID = GlobalState.getGroupId();
  const ADMIN_ID = GlobalState.getAdminId();

  // Проверка, состоит ли пользователь в группе
  let isMember = false;
  try {
    const chatMember = await ctx.telegram.getChatMember(GROUP_ID, ctx.from.id);
    isMember = ['member', 'administrator', 'creator'].includes(chatMember.status);
  } catch (error) {
    console.error('Ошибка проверки членства в группе:', error);
  }

  if (!isMember) {
    return { error: '⚠️ Чтобы записаться, вступите в группу!' };
  }

  // Формирование объекта user с учётом проверки username и name
  let userName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');
  const userUsername = ctx.from.username ? `${ctx.from.username}` : null;

  // Пытаемся очистить эмодзи из имени пользователя
  const cleaned = cleanPlayerName(userName, userUsername);

  // Если после очистки имя стало пустым - запрещаем вход
  if (!cleaned.allowed) {
    return { error: '⚠️ Недопустимые символы в имени. После удаления эмодзи имя стало пустым. Пожалуйста, установите нормальный ник в Telegram.' };
  }

  // Используем очищенные значения
  userName = cleaned.name;
  const finalUserUsername = cleaned.username;

  const user = {
    id: ctx.from.id,
    name: userName,
    username: finalUserUsername,
    goals: 0,
    assists: 0,
    saves: 0,
    gamesPlayed: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    rating: 0,
  };

  const [updatedUser] = await getPlayerStats([user]);
  const isAdmin = ADMIN_ID.includes(updatedUser.id);
  // Формируем displayName как name и username в скобках, если username существует
  const displayName = updatedUser.username ? `${updatedUser.name} (${updatedUser.username})` : updatedUser.name;

  return { user: updatedUser, isAdmin, displayName };
};

const notifyTeamFormation = async (ctx, bot, GlobalState) => {
  const location = GlobalState.getLocation();
  const players = GlobalState.getPlayers();
  const queue = GlobalState.getQueue();
  const groupId = GlobalState.getGroupId();

  const count = players.length;

  if (location === 'zalkz') {
    if (count === 16) {
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        groupId,
        '🏆 Собрано 2 команды (16 игроков)',
      ]);
      deleteMessageAfterDelay(ctx, message.message_id, 60000);
    } else if (count === 24) {
      const queueLength = queue.length;
      if (queueLength < 6) {
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          groupId,
          `🏆 3 команды (24 игрока) собрались! Для открытия 4-й команды нужно еще минимум ${6 - queueLength} в очереди.`,
        ]);
        deleteMessageAfterDelay(ctx, message.message_id, 60000);
      } else {
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          groupId,
          '🏆 3 команды собрались и очередь уже полна для 4-й! Готовимся к 4 командам.',
        ]);
        deleteMessageAfterDelay(ctx, message.message_id, 60000);
      }
    } else if (count === 32) {
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        groupId,
        '🏆 Собрано 4 команды (32 игрока)',
      ]);
      deleteMessageAfterDelay(ctx, message.message_id, 60000);
    }
  } else {
    if (count === 10) {
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        groupId,
        '🏆 Собрано 2 команды (10 игроков)!',
      ]);
      deleteMessageAfterDelay(ctx, message.message_id, 60000);
    } else if (count === 15) {
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        groupId,
        '🏆 Собрано 3 команды (15 игроков)!',
      ]);
      deleteMessageAfterDelay(ctx, message.message_id, 60000);
    } else if (count === 20) {
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        groupId,
        '🏆 Собрано 4 команды (20 игроков)!',
      ]);
      deleteMessageAfterDelay(ctx, message.message_id, 60000);
    }
  }
};

module.exports = (bot, GlobalState) => {
  bot.on('text', async (ctx) => {
    // Пропускаем команду reset - она обрабатывается отдельным обработчиком
    if (/^reset$/i.test(ctx.message.text)) {
      return;
    }

    const players = GlobalState.getPlayers();
    const queue = GlobalState.getQueue();
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();
    const MAX_PLAYERS = GlobalState.getMaxPlayers();
    const isTeamsDivided = GlobalState.getDivided();

    const validationResult = await validateAndCreateUser(ctx, GlobalState);
    if (validationResult.error) {
      await ctx.deleteMessage().catch(() => {});
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        validationResult.error,
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 10000);
    }

    const { user: updatedUser, isAdmin, displayName } = validationResult;

    if (ctx.message.text === '+') {
      await ctx.deleteMessage().catch(() => {});

      if (!isMatchStarted) {
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          ctx.chat.id,
          '⚠️ Матч не начат!',
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
      if (isTeamsDivided) {
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          ctx.chat.id,
          '⚽ <b>Матч уже стартовал!</b> Запись закрыта.',
          { parse_mode: 'HTML' },
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
      const isInList =
        players.some((p) => p.id === updatedUser.id) ||
        queue.some((p) => p.id === updatedUser.id);
      if (isInList) {
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          ctx.chat.id,
          '⚠️ Вы уже записаны!',
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
      if (players.length < MAX_PLAYERS) {
        players.push(updatedUser);
        if (!isAdmin) {
          for (const adminId of ADMIN_ID) {
            if (isNaN(adminId) || adminId <= 0) {
              console.warn(`Некорректный adminId: ${adminId}`);
              continue;
            }
            await sendPrivateMessage(
              bot,
              adminId,
              `➕ Игрок ${displayName} записался в основной состав`,
            );
          }
        }
      } else {
        queue.push(updatedUser);
        if (!isAdmin) {
          for (const adminId of ADMIN_ID) {
            if (isNaN(adminId) || adminId <= 0) {
              console.warn(`Некорректный adminId: ${adminId}`);
              continue;
            }
            await sendPrivateMessage(
              bot,
              adminId,
              `➕ Игрок ${displayName} записался в очередь`,
            );
          }
        }
      }
      await sendPlayerList(ctx);
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        `✅ ${displayName} добавлен!`,
      ]);
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
      await notifyTeamFormation(ctx, bot, GlobalState);
    } else if (ctx.message.text === '-') {
      await ctx.deleteMessage().catch(() => {});
      if (!isMatchStarted) {
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          ctx.chat.id,
          '⚠️ Матч не начат!',
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
      if (isTeamsDivided) {
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          ctx.chat.id,
          '⚽ <b>Матч уже стартовал!</b> Запись закрыта.',
          { parse_mode: 'HTML' },
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
      const playerIndex = players.findIndex((p) => p.id === updatedUser.id);
      if (playerIndex !== -1) {
        players.splice(playerIndex, 1);
        if (!isAdmin) {
          for (const adminId of ADMIN_ID) {
            if (isNaN(adminId) || adminId <= 0) {
              console.warn(`Некорректный adminId: ${adminId}`);
              continue;
            }
            await sendPrivateMessage(
              bot,
              adminId,
              `➖ Игрок ${displayName} вышел из основного состава`,
            );
          }
        }
        if (queue.length > 0) {
          const movedPlayer = queue.shift();
          let movedName = movedPlayer.name;
          if (movedPlayer.username && !containsEmojiOrUnicode(movedPlayer.username)) {
            if (movedPlayer.name && containsEmojiOrUnicode(movedPlayer.name)) {
              movedName = movedPlayer.username;
            }
          }
          const updatedMovedPlayer = { ...movedPlayer, name: movedName };
          const movedDisplayName = updatedMovedPlayer.username ? `${updatedMovedPlayer.name} (${updatedMovedPlayer.username})` : updatedMovedPlayer.name;
          players.push(updatedMovedPlayer);
          await sendPrivateMessage(
            bot,
            updatedMovedPlayer.id,
            '🎉 Вы в основном составе!',
          );
          if (!ADMIN_ID.includes(updatedMovedPlayer.id)) {
            for (const adminId of ADMIN_ID) {
              if (isNaN(adminId) || adminId <= 0) {
                console.warn(`Некорректный adminId: ${adminId}`);
                continue;
              }
              await sendPrivateMessage(
                bot,
                adminId,
                `🔄 Игрок ${movedDisplayName} перемещен из очереди в основной состав`,
              );
            }
          }
        }
        await sendPlayerList(ctx);
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          ctx.chat.id,
          `🚶 ${displayName} вышел!`,
        ]);
        deleteMessageAfterDelay(ctx, message.message_id, 6000);
        await notifyTeamFormation(ctx, bot, GlobalState);
      } else {
        const queueIndex = queue.findIndex((p) => p.id === updatedUser.id);
        if (queueIndex !== -1) {
          queue.splice(queueIndex, 1);
          if (!isAdmin) {
            for (const adminId of ADMIN_ID) {
              if (isNaN(adminId) || adminId <= 0) {
                console.warn(`Некорректный adminId: ${adminId}`);
                continue;
              }
              await sendPrivateMessage(
                bot,
                adminId,
                `➖ Игрок ${displayName} вышел из очереди`,
              );
            }
          }
          await sendPlayerList(ctx);
          const message = await safeTelegramCall(ctx, 'sendMessage', [
            ctx.chat.id,
            `🚶 ${displayName} вышел!`,
          ]);
          deleteMessageAfterDelay(ctx, message.message_id, 6000);
          await notifyTeamFormation(ctx, bot, GlobalState);
        } else {
          const message = await safeTelegramCall(ctx, 'sendMessage', [
            ctx.chat.id,
            '⚠️ Вы не в списке!',
          ]);
          deleteMessageAfterDelay(ctx, message.message_id, 6000);
        }
      }
    } else if (ctx.message.text === '+1test') {
      await ctx.deleteMessage().catch(() => {});
      if (!ADMIN_ID.includes(ctx.from.id)) {
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          ctx.chat.id,
          '⛔ У вас нет прав для этой команды!',
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
      if (!isMatchStarted) {
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          ctx.chat.id,
          '⚠️ Матч не начат!',
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      const addedPlayers = [];
      const baseTestUserCount = players.length + queue.length;

      // Определяем разные типы тестовых игроков для проверки различных случаев
      const testPlayerConfigs = [
        {
          // 1. Только с name (без username)
          name: `TestNameOnly${baseTestUserCount + 1}`,
          username: null,
          description: 'Только name',
        },
        {
          // 2. Только с username (без name)
          name: null,
          username: `testuseronly${baseTestUserCount + 2}`,
          description: 'Только username',
        },
        {
          // 3. Без name и username (оба null)
          name: null,
          username: null,
          description: 'Без name и username',
        },
        {
          // 4. Без name и username (оба undefined)
          name: undefined,
          username: undefined,
          description: 'Без name и username (undefined)',
        },
        {
          // 5. Длинные ники
          name: 'ОченьДлинноеИмяИгрокаДляТестированияМаксимальнойДлиныИПроверкиФорматирования',
          username: 'verylongusernamethatexceedsnormallimitsandtestsformattinganddisplay',
          description: 'Длинные ники',
        },
        {
          // 6. Короткие ники
          name: 'А',
          username: 'B',
          description: 'Короткие ники',
        },
        {
          // 7. Ники с эмодзи (проверка очистки)
          name: 'Test😀Player',
          username: 'test🎮user',
          description: 'Ники с эмодзи',
        },
        {
          // 8. Только эмодзи (без текста) - должен быть заблокирован после очистки
          name: '😀🎮⚽',
          username: '🏆🎯🧤',
          description: 'Только эмодзи',
        },
        {
          // 9. С пробелами в имени
          name: 'Test Player With Spaces',
          username: 'test_user_with_underscores',
          description: 'С пробелами',
        },
        {
          // 10. Только пробелы
          name: '   ',
          username: '   ',
          description: 'Только пробелы',
        },
        {
          // 11. С цифрами и спецсимволами
          name: 'Player123',
          username: 'user_456_test',
          description: 'С цифрами',
        },
        {
          // 12. С пустыми строками
          name: '',
          username: '',
          description: 'Пустые строки',
        },
        {
          // 13. Смешанный случай: длинный name, короткий username
          name: 'ОченьДлинноеИмяИгрока',
          username: 'XY',
          description: 'Длинный name, короткий username',
        },
        {
          // 14. Смешанный случай: короткий name, длинный username
          name: 'XY',
          username: 'verylongusernamethatexceedsnormallimitsandtestsformatting',
          description: 'Короткий name, длинный username',
        },
        {
          // 15. Кириллица в name, латиница в username
          name: 'ИгрокТест',
          username: 'player_test',
          description: 'Кириллица + латиница',
        },
        {
          // 16. Только кириллица
          name: 'ТестовыйИгрок',
          username: 'тестовыйюзер',
          description: 'Только кириллица',
        },
        {
          // 17. Только латиница верхний регистр
          name: 'TEST PLAYER',
          username: 'TESTUSER',
          description: 'Верхний регистр',
        },
        {
          // 18. Только латиница нижний регистр
          name: 'test player',
          username: 'testuser',
          description: 'Нижний регистр',
        },
        {
          // 19. Смешанный регистр
          name: 'TeSt PlAyEr',
          username: 'TeStUsEr',
          description: 'Смешанный регистр',
        },
        {
          // 20. С дефисами и точками
          name: 'Test-Player.Name',
          username: 'test-user.name',
          description: 'С дефисами и точками',
        },
        {
          // 21. Очень длинное имя с пробелами
          name: 'Очень Длинное Имя Игрока С Множеством Пробелов Для Тестирования',
          username: 'very_long_username_with_many_underscores_for_testing',
          description: 'Длинное с пробелами',
        },
        {
          // 22. Один символ кириллицы
          name: 'Я',
          username: 'Я',
          description: 'Один символ кириллицы',
        },
        {
          // 23. С нулевыми значениями статистики
          name: 'PlayerWithZeroStats',
          username: 'player_zero',
          description: 'С нулевой статистикой',
        },
        {
          // 24. Смешанные спецсимволы (без эмодзи)
          name: 'Player!@#$%',
          username: 'user_123_test',
          description: 'Спецсимволы',
        },
        {
          // 25. Имя с табуляцией (будет заменено на пробелы)
          name: 'Test\tPlayer',
          username: 'test\tuser',
          description: 'С табуляцией',
        },
        {
          // 26. Математические алфавитные символы (декоративные буквы) + эмодзи
          name: 'Fjfjd😎😎😊 𝕹𝖎𝖐𝖎𝖙𝖆 𝕬𝖑𝖊𝖐𝖘𝖆𝖓𝖉𝖗𝖔𝖛𝖎𝖈𝖍',
          username: 'Fjfjd😎😎😊 𝕹𝖎𝖐𝖎𝖙𝖆 𝕬𝖑𝖊𝖐𝖘𝖆𝖓𝖉𝖗𝖔𝖛𝖎𝖈𝖍',
          description: 'Математические алфавитные символы + эмодзи',
        },
        {
          // 27. Только математические алфавитные символы (декоративные буквы)
          name: '𝕹𝖎𝖐𝖎𝖙𝖆 𝕬𝖑𝖊𝖐𝖘𝖆𝖓𝖉𝖗𝖔𝖛𝖎𝖈𝖍',
          username: 'hcndbdncj',
          description: 'С табуляцией',
        },
        {
          // 25. Имя с табуляцией (будет заменено на пробелы)
          name: 'hcndbdncj',
          username: 'Fjfjd😎😎😊 𝕹𝖎𝖐𝖎𝖙𝖆 𝕬𝖑𝖊𝖐𝖘𝖆𝖓𝖉𝖗𝖔𝖛𝖎𝖈𝖍',
          description: 'С табуляцией',
        },
      ];

      for (let i = 0; i < testPlayerConfigs.length; i++) {
        const config = testPlayerConfigs[i];
        const testUserCount = baseTestUserCount + i + 1;

        // Пытаемся очистить эмодзи из имени игрока
        const cleaned = cleanPlayerName(config.name, config.username);

        // Если после очистки имя стало пустым - пропускаем этого игрока
        if (!cleaned.allowed) {
          console.warn(`[+1test] Пропущен тестовый игрок (после очистки эмодзи имя пустое): ${config.description}`, {
            originalName: config.name,
            originalUsername: config.username,
          });
          continue;
        }

        const testUser = {
          id: 100000 + testUserCount,
          name: cleaned.name,
          username: cleaned.username,
          goals: 0,
          assists: 0,
          saves: 0,
          gamesPlayed: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          rating: 0,
        };

        const [updatedTestUser] = await getPlayerStats([testUser]);
        const isInList =
          players.some((p) => p.id === updatedTestUser.id) ||
          queue.some((p) => p.id === updatedTestUser.id);
        if (isInList) continue;

        // Формируем отображаемое имя для лога
        const testDisplayName = updatedTestUser.username
          ? `${updatedTestUser.name || 'NULL'} (${updatedTestUser.username})`
          : updatedTestUser.name || 'NULL';
        const displayInfo = `${testDisplayName} [${config.description}]`;

        if (players.length < MAX_PLAYERS) {
          players.push(updatedTestUser);
          addedPlayers.push(`${displayInfo} (в список)`);
        } else {
          queue.push(updatedTestUser);
          addedPlayers.push(`${displayInfo} (в очередь)`);
        }
      }

      if (addedPlayers.length > 0) {
        const messageText = `✅ Добавлены тестовые игроки (${addedPlayers.length}/${testPlayerConfigs.length}):\n${addedPlayers.join('\n')}`;
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          ctx.chat.id,
          messageText,
        ]);
        deleteMessageAfterDelay(ctx, message.message_id, 10000);
        await sendPlayerList(ctx);
        await notifyTeamFormation(ctx, bot, GlobalState);
      } else {
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          ctx.chat.id,
          '⚠️ Все тестовые игроки уже добавлены или нет места!',
        ]);
        deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
    } else if (ctx.message.text.startsWith('+add ')) {
      await ctx.deleteMessage().catch(() => {});
      if (!ADMIN_ID.includes(ctx.from.id)) {
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          ctx.chat.id,
          '⛔ У вас нет прав для этой команды!',
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
      if (!isMatchStarted) {
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          ctx.chat.id,
          '⚠️ Матч не начат!',
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
      if (isTeamsDivided) {
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          ctx.chat.id,
          '⚽ <b>Матч уже стартовал!</b> Запись закрыта.',
          { parse_mode: 'HTML' },
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      // Извлекаем имя игрока из команды
      const playerName = ctx.message.text.substring(5).trim(); // "+add " = 5 символов

      if (!playerName) {
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          ctx.chat.id,
          '⚠️ Укажите имя игрока! Использование: +add <имя>',
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      // Пытаемся очистить эмодзи из имени игрока
      const cleaned = cleanPlayerName(playerName, null);

      // Если после очистки имя стало пустым - запрещаем добавление
      if (!cleaned.allowed || !cleaned.name) {
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          ctx.chat.id,
          '⚠️ Недопустимые символы в имени игрока. После удаления эмодзи имя стало пустым.',
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      try {
        // Получаем или создаем игрока по очищенному имени
        const playerData = await getPlayerByName(cleaned.name);

        const newPlayer = {
          id: playerData.id,
          name: playerData.name || playerData.username,
          username: playerData.username || playerData.name,
          goals: 0,
          assists: 0,
          saves: 0,
          gamesPlayed: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          rating: 0,
        };

        // Получаем статистику игрока из базы данных
        const [updatedPlayer] = await getPlayerStats([newPlayer]);

        // Обновляем username, если он был изменен в базе данных
        updatedPlayer.username = updatedPlayer.username || updatedPlayer.name || playerName;
        updatedPlayer.name = updatedPlayer.name || updatedPlayer.username || playerName;

        // Проверяем, не добавлен ли уже игрок
        const isInList =
          players.some((p) => p.id === updatedPlayer.id) ||
          queue.some((p) => p.id === updatedPlayer.id);

        if (isInList) {
          const displayName = updatedPlayer.username || updatedPlayer.name;
          const message = await safeTelegramCall(ctx, 'sendMessage', [
            ctx.chat.id,
            `⚠️ Игрок ${displayName} уже в списке!`,
          ]);
          return deleteMessageAfterDelay(ctx, message.message_id, 6000);
        }

        const displayName = updatedPlayer.username || updatedPlayer.name;

        // Добавляем игрока в список или очередь
        if (players.length < MAX_PLAYERS) {
          players.push(updatedPlayer);
          const message = await safeTelegramCall(ctx, 'sendMessage', [
            ctx.chat.id,
            `✅ Игрок ${displayName} добавлен в основной состав!`,
          ]);
          deleteMessageAfterDelay(ctx, message.message_id, 6000);
        } else {
          queue.push(updatedPlayer);
          const message = await safeTelegramCall(ctx, 'sendMessage', [
            ctx.chat.id,
            `✅ Игрок ${displayName} добавлен в очередь!`,
          ]);
          deleteMessageAfterDelay(ctx, message.message_id, 6000);
        }

        await sendPlayerList(ctx);
        await notifyTeamFormation(ctx, bot, GlobalState);
      } catch (error) {
        console.error('Ошибка при добавлении игрока по имени:', error);
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          ctx.chat.id,
          '❌ Ошибка при добавлении игрока. Попробуйте позже.',
        ]);
        deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
    }
  });

  bot.action('join_match', async (ctx) => {
    const players = GlobalState.getPlayers();
    const queue = GlobalState.getQueue();
    const MAX_PLAYERS = GlobalState.getMaxPlayers();
    const isTeamsDivided = GlobalState.getDivided();
    const ADMIN_ID = GlobalState.getAdminId();

    const validationResult = await validateAndCreateUser(ctx, GlobalState);
    if (validationResult.error) {
      await safeAnswerCallback(ctx, validationResult.error);
      return;
    }

    const { user: updatedUser, isAdmin, displayName } = validationResult;

    if (isTeamsDivided) {
      await safeAnswerCallback(ctx, '⚽ Матч уже стартовал! Запись закрыта.');
      return;
    }

    const isInList =
      players.some((p) => p.id === updatedUser.id) ||
      queue.some((p) => p.id === updatedUser.id);

    if (isInList) {
      await safeAnswerCallback(ctx, '⚠️ Вы уже записаны!');
      return;
    }

    if (players.length < MAX_PLAYERS) {
      players.push(updatedUser);
      await safeAnswerCallback(ctx, '✅ Вы добавлены в список!');
      if (!isAdmin) {
        for (const adminId of ADMIN_ID) {
          if (isNaN(adminId) || adminId <= 0) {
            console.warn(`Некорректный adminId: ${adminId}`);
            continue;
          }
          await sendPrivateMessage(
            bot,
            adminId,
            `➕ Игрок ${displayName} записался в основной состав через кнопку`,
          );
        }
      }
    } else {
      queue.push(updatedUser);
      await safeAnswerCallback(ctx, '✅ Вы добавлены в очередь!');
      if (!isAdmin) {
        for (const adminId of ADMIN_ID) {
          if (isNaN(adminId) || adminId <= 0) {
            console.warn(`Некорректный adminId: ${adminId}`);
            continue;
          }
          await sendPrivateMessage(
            bot,
            adminId,
            `➕ Игрок ${displayName} записался в очередь через кнопку`,
          );
        }
      }
    }

    await sendPlayerList(ctx);
    await notifyTeamFormation(ctx, bot, GlobalState);
  });

  bot.action('leave_match', async (ctx) => {
    const players = GlobalState.getPlayers();
    const queue = GlobalState.getQueue();
    const isTeamsDivided = GlobalState.getDivided();
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();

    const validationResult = await validateAndCreateUser(ctx, GlobalState);
    if (validationResult.error) {
      await safeAnswerCallback(ctx, validationResult.error);
      return;
    }

    const { user: updatedUser, isAdmin, displayName } = validationResult;

    if (!isMatchStarted) {
      await safeAnswerCallback(ctx, '⚠️ Матч не начат!');
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⚠️ Матч не начат!',
      ]);
      if (message) {
        deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
      return;
    }

    if (isTeamsDivided) {
      await safeAnswerCallback(ctx, '⚽ Матч уже стартовал! Запись закрыта.');
      return;
    }

    const playerIndex = players.findIndex((p) => p.id === updatedUser.id);
    if (playerIndex !== -1) {
      players.splice(playerIndex, 1);
      if (!isAdmin) {
        for (const adminId of ADMIN_ID) {
          if (isNaN(adminId) || adminId <= 0) {
            console.warn(`Некорректный adminId: ${adminId}`);
            continue;
          }
          await sendPrivateMessage(
            bot,
            adminId,
            `➖ Игрок ${displayName} вышел из основного состава через кнопку`,
          );
        }
      }
      if (queue.length > 0) {
        const movedPlayer = queue.shift();
        let movedName = movedPlayer.name;
        if (movedPlayer.username && !containsEmojiOrUnicode(movedPlayer.username)) {
          if (movedPlayer.name && containsEmojiOrUnicode(movedPlayer.name)) {
            movedName = movedPlayer.username;
          }
        }
        const updatedMovedPlayer = { ...movedPlayer, name: movedName };
        const movedDisplayName = updatedMovedPlayer.username ? `${updatedMovedPlayer.name} (${updatedMovedPlayer.username})` : updatedMovedPlayer.name;
        players.push(updatedMovedPlayer);
        await sendPrivateMessage(
          bot,
          updatedMovedPlayer.id,
          '🎉 Вы в основном составе!',
        );
        if (!ADMIN_ID.includes(updatedMovedPlayer.id)) {
          for (const adminId of ADMIN_ID) {
            if (isNaN(adminId) || adminId <= 0) {
              console.warn(`Некорректный adminId: ${adminId}`);
              continue;
            }
            await sendPrivateMessage(
              bot,
              adminId,
              `🔄 Игрок ${movedDisplayName} перемещен из очереди в основной состав`,
            );
          }
        }
      }
      await sendPlayerList(ctx);
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        `🚶 ${displayName} вышел!`,
      ]);
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
      await safeAnswerCallback(ctx, `🚶 ${displayName}, вы вышли!`);
      await notifyTeamFormation(ctx, bot, GlobalState);
    } else {
      const queueIndex = queue.findIndex((p) => p.id === updatedUser.id);
      if (queueIndex !== -1) {
        queue.splice(queueIndex, 1);
        if (!isAdmin) {
          for (const adminId of ADMIN_ID) {
            if (isNaN(adminId) || adminId <= 0) {
              console.warn(`Некорректный adminId: ${adminId}`);
              continue;
            }
            await sendPrivateMessage(
              bot,
              adminId,
              `➖ Игрок ${displayName} вышел из очереди через кнопку`,
            );
          }
        }
        await sendPlayerList(ctx);
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          ctx.chat.id,
          `🚶 ${displayName} вышел!`,
        ]);
        deleteMessageAfterDelay(ctx, message.message_id, 6000);
        await safeAnswerCallback(ctx, `🚶 ${displayName}, вы вышли!`);
        await notifyTeamFormation(ctx, bot, GlobalState);
      } else {
        await safeAnswerCallback(ctx, '⚠️ Вы не в списке!');
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          ctx.chat.id,
          '⚠️ Вы не в списке!',
        ]);
        if (message) {
          deleteMessageAfterDelay(ctx, message.message_id, 6000);
        }
      }
    }
  });
};
