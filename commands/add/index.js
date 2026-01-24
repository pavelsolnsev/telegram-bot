const { deleteMessageAfterDelay } = require('../../utils/deleteMessageAfterDelay');
const { sendPlayerList } = require('../../utils/sendPlayerList');
const { safeTelegramCall } = require('../../utils/telegramUtils');
const { safeAnswerCallback } = require('../../utils/safeAnswerCallback');
const getPlayerStats = require('../../database/getPlayerStats');
const getPlayerByName = require('../../database/getPlayerByName');
const { validateAndCreateUser, cleanPlayerName } = require('./validation');
const { notifyTeamFormation } = require('./notifications');
const { addPlayer, removePlayer, addPlayerByButton, removePlayerByButton } = require('./playerManagement');

module.exports = (bot, GlobalState) => {
  bot.on('text', async (ctx) => {
    // Проверка на валидность ctx.from и ctx.chat
    if (!ctx.from || typeof ctx.from.id !== 'number') {
      console.error('Ошибка: некорректный ctx.from в bot.on(text)');
      return;
    }
    if (!ctx.chat || typeof ctx.chat.id !== 'number') {
      console.error('Ошибка: некорректный ctx.chat в bot.on(text)');
      return;
    }

    // Пропускаем команду reset - она обрабатывается отдельным обработчиком
    if (/^reset$/i.test(ctx.message?.text)) {
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
      if (message && message.message_id) {
        return deleteMessageAfterDelay(ctx, message.message_id, 10000);
      }
      return;
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
      await addPlayer(ctx, bot, GlobalState, updatedUser, isAdmin, displayName);
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
      await removePlayer(ctx, bot, GlobalState, updatedUser, isAdmin, displayName);
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
          name: `TestNameOnly${baseTestUserCount + 1}`,
          username: null,
          description: 'Только name',
        },
        {
          name: null,
          username: `testuseronly${baseTestUserCount + 2}`,
          description: 'Только username',
        },
        {
          name: null,
          username: null,
          description: 'Без name и username',
        },
        {
          name: undefined,
          username: undefined,
          description: 'Без name и username (undefined)',
        },
        {
          name: 'ОченьДлинноеИмяИгрокаДляТестированияМаксимальнойДлиныИПроверкиФорматирования',
          username: 'verylongusernamethatexceedsnormallimitsandtestsformattinganddisplay',
          description: 'Длинные ники',
        },
        {
          name: 'А',
          username: 'B',
          description: 'Короткие ники',
        },
        {
          name: 'Test😀Player',
          username: 'test🎮user',
          description: 'Ники с эмодзи',
        },
        {
          name: '😀🎮⚽',
          username: '🏆🎯🧤',
          description: 'Только эмодзи',
        },
        {
          name: 'Test Player With Spaces',
          username: 'test_user_with_underscores',
          description: 'С пробелами',
        },
        {
          name: '   ',
          username: '   ',
          description: 'Только пробелы',
        },
        {
          name: 'Player123',
          username: 'user_456_test',
          description: 'С цифрами',
        },
        {
          name: '',
          username: '',
          description: 'Пустые строки',
        },
        {
          name: 'ОченьДлинноеИмяИгрока',
          username: 'XY',
          description: 'Длинный name, короткий username',
        },
        {
          name: 'XY',
          username: 'verylongusernamethatexceedsnormallimitsandtestsformatting',
          description: 'Короткий name, длинный username',
        },
        {
          name: 'ИгрокТест',
          username: 'player_test',
          description: 'Кириллица + латиница',
        },
        {
          name: 'ТестовыйИгрок',
          username: 'тестовыйюзер',
          description: 'Только кириллица',
        },
        {
          name: 'TEST PLAYER',
          username: 'TESTUSER',
          description: 'Верхний регистр',
        },
        {
          name: 'test player',
          username: 'testuser',
          description: 'Нижний регистр',
        },
        {
          name: 'TeSt PlAyEr',
          username: 'TeStUsEr',
          description: 'Смешанный регистр',
        },
        {
          name: 'Test-Player.Name',
          username: 'test-user.name',
          description: 'С дефисами и точками',
        },
        {
          name: 'Очень Длинное Имя Игрока С Множеством Пробелов Для Тестирования',
          username: 'very_long_username_with_many_underscores_for_testing',
          description: 'Длинное с пробелами',
        },
        {
          name: 'Я',
          username: 'Я',
          description: 'Один символ кириллицы',
        },
        {
          name: 'PlayerWithZeroStats',
          username: 'player_zero',
          description: 'С нулевой статистикой',
        },
        {
          name: 'Player!@#$%',
          username: 'user_123_test',
          description: 'Спецсимволы',
        },
        {
          name: 'Test\tPlayer',
          username: 'test\tuser',
          description: 'С табуляцией',
        },
        {
          name: 'Fjfjd😎😎😊 𝕹𝖎𝖐𝖎𝖙𝖆 𝕬𝖑𝖊𝖐𝖘𝖆𝖓𝖉𝖗𝖔𝖛𝖎𝖈𝖍',
          username: 'Fjfjd😎😎😊 𝕹𝖎𝖐𝖎𝖙𝖆 𝕬𝖑𝖊𝖐𝖘𝖆𝖓𝖉𝖗𝖔𝖛𝖎𝖈𝖍',
          description: 'Математические алфавитные символы + эмодзи',
        },
        {
          name: '𝕹𝖎𝖐𝖎𝖙𝖆 𝕬𝖑𝖊𝖐𝖘𝖆𝖓𝖉𝖗𝖔𝖛𝖎𝖈𝖍',
          username: 'hcndbdncj',
          description: 'Только математические символы',
        },
        {
          name: 'hcndbdncj',
          username: 'Fjfjd😎😎😊 𝕹𝖎𝖐𝖎𝖙𝖆 𝕬𝖑𝖊𝖐𝖘𝖆𝖓𝖉𝖗𝖔𝖛𝖎𝖈𝖍',
          description: 'Смешанные символы',
        },
      ];

      for (let i = 0; i < testPlayerConfigs.length; i++) {
        const config = testPlayerConfigs[i];
        const testUserCount = baseTestUserCount + i + 1;

        const cleaned = cleanPlayerName(config.name, config.username);

        if (!cleaned.allowed) {
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

      const playerName = ctx.message.text.substring(5).trim();

      if (!playerName) {
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          ctx.chat.id,
          '⚠️ Укажите имя игрока! Использование: +add <имя>',
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      const cleaned = cleanPlayerName(playerName, null);

      if (!cleaned.allowed || !cleaned.name) {
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          ctx.chat.id,
          '⚠️ Недопустимые символы в имени игрока. После удаления эмодзи имя стало пустым.',
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      try {
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

        const [updatedPlayer] = await getPlayerStats([newPlayer]);

        updatedPlayer.username = updatedPlayer.username || updatedPlayer.name || playerName;
        updatedPlayer.name = updatedPlayer.name || updatedPlayer.username || playerName;

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
    const isTeamsDivided = GlobalState.getDivided();

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

    await addPlayerByButton(ctx, bot, GlobalState, updatedUser, isAdmin, displayName);
  });

  bot.action('leave_match', async (ctx) => {
    const isTeamsDivided = GlobalState.getDivided();
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

    await removePlayerByButton(ctx, bot, GlobalState, updatedUser, isAdmin, displayName);
  });
};
