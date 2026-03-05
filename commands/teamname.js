const { GlobalState } = require('../store');
const { deleteMessageAfterDelay } = require('../utils/deleteMessageAfterDelay');
const { getTeamColor } = require('../utils/getTeamColor');

module.exports = (bot) => {
  bot.hears(/^tn\s+(\d+)\s+(.+)$/i, async (ctx) => {
    try {
      // Проверка на валидность ctx.from и ctx.chat
      if (!ctx.from || typeof ctx.from.id !== 'number') {
        console.error('Ошибка: некорректный ctx.from в команде tn');
        return;
      }
      if (!ctx.chat || typeof ctx.chat.id !== 'number') {
        console.error('Ошибка: некорректный ctx.chat в команде tn');
        return;
      }

      const ADMIN_ID = GlobalState.getAdminId();

      // Проверка на валидность ADMIN_ID
      if (!Array.isArray(ADMIN_ID)) {
        console.error('Ошибка: ADMIN_ID не является массивом');
        return;
      }

      // Проверка, что команда отправлена в личку (chat.id > 0 для личных чатов)
      if (ctx.chat.id < 0) {
        const message = await ctx.reply('⚠️ Команда доступна только в личных сообщениях с ботом.');
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      // Удаляем сообщение с командой
      await ctx.deleteMessage().catch(() => {});

      // Проверка прав администратора
      if (!ADMIN_ID.includes(ctx.from.id)) {
        const message = await ctx.reply('⛔ У вас нет прав для этой команды.');
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      // Проверка на валидность ctx.match
      if (!ctx.match || ctx.match.length < 3) {
        console.error('Ошибка: некорректный формат команды tn');
        const message = await ctx.reply('⚠️ Некорректный формат команды. Используйте: tn <номер> <название>');
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      const teamIndex = parseInt(ctx.match[1], 10) - 1; // Преобразуем в 0-based индекс
      const teamName = ctx.match[2] ? ctx.match[2].trim() : '';

      // Проверка валидности номера команды
      if (teamIndex < 0 || teamIndex > 3) {
        const message = await ctx.reply('⚠️ Номер команды должен быть от 1 до 4.');
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      // Проверка длины названия
      if (teamName.length > 30) {
        const message = await ctx.reply('⚠️ Название команды слишком длинное (максимум 30 символов).');
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      const color = getTeamColor(teamIndex);

      // Устанавливаем название команды
      GlobalState.setTeamName(teamIndex, teamName);

      const message = await ctx.reply(
        `✅ Название команды изменено:\n${color} <b>${teamName}</b>`,
        { parse_mode: 'HTML' },
      );
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    } catch (error) {
      console.error('Ошибка в команде tn:', error.message);
      const message = await ctx.reply('⚠️ Произошла ошибка при изменении названия команды.');
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
  });

  // Команда для сброса названий команд
  bot.hears(/^tn\s+reset$/i, async (ctx) => {
    try {
      // Проверка на валидность ctx.from и ctx.chat
      if (!ctx.from || typeof ctx.from.id !== 'number') {
        console.error('Ошибка: некорректный ctx.from в команде tn reset');
        return;
      }
      if (!ctx.chat || typeof ctx.chat.id !== 'number') {
        console.error('Ошибка: некорректный ctx.chat в команде tn reset');
        return;
      }

      const ADMIN_ID = GlobalState.getAdminId();

      // Проверка на валидность ADMIN_ID
      if (!Array.isArray(ADMIN_ID)) {
        console.error('Ошибка: ADMIN_ID не является массивом');
        return;
      }

      // Проверка, что команда отправлена в личку (chat.id > 0 для личных чатов)
      if (ctx.chat.id < 0) {
        const message = await ctx.reply('⚠️ Команда доступна только в личных сообщениях с ботом.');
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      // Удаляем сообщение с командой
      await ctx.deleteMessage().catch(() => {});

      // Проверка прав администратора
      if (!ADMIN_ID.includes(ctx.from.id)) {
        const message = await ctx.reply('⛔ У вас нет прав для этой команды.');
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      // Сбрасываем названия команд
      GlobalState.resetTeamNames();

      const message = await ctx.reply('✅ Названия команд сброшены к значениям по умолчанию.');
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    } catch (error) {
      console.error('Ошибка в команде tn reset:', error.message);
      const message = await ctx.reply('⚠️ Произошла ошибка при сбросе названий команд.');
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
  });
};
