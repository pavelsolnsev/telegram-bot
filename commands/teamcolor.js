const { GlobalState } = require('../store');
const { deleteMessageAfterDelay } = require('../utils/deleteMessageAfterDelay');
const { ALLOWED_TEAM_COLORS, DEFAULT_TEAM_COLORS } = require('../utils/getTeamColor');

const normalizeColor = (value) => String(value || '').replace(/\uFE0F/g, '');

const resolveAllowedColor = (value) => {
  const normalized = normalizeColor(value);
  return ALLOWED_TEAM_COLORS.find((color) => normalizeColor(color) === normalized) || null;
};

module.exports = (bot) => {
  bot.hears(/^tc\s+(\d+)\s+(\S+)$/i, async (ctx) => {
    try {
      if (!ctx.from || typeof ctx.from.id !== 'number') {
        console.error('Ошибка: некорректный ctx.from в команде tc');
        return;
      }
      if (!ctx.chat || typeof ctx.chat.id !== 'number') {
        console.error('Ошибка: некорректный ctx.chat в команде tc');
        return;
      }

      const ADMIN_ID = GlobalState.getAdminId();
      if (!Array.isArray(ADMIN_ID)) {
        console.error('Ошибка: ADMIN_ID не является массивом');
        return;
      }

      if (ctx.chat.id < 0) {
        const message = await ctx.reply('⚠️ Команда доступна только в личных сообщениях с ботом.');
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      await ctx.deleteMessage().catch(() => {});

      if (!ADMIN_ID.includes(ctx.from.id)) {
        const message = await ctx.reply('⛔ У вас нет прав для этой команды.');
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      if (!ctx.match || ctx.match.length < 3) {
        const message = await ctx.reply('⚠️ Некорректный формат команды. Используйте: tc <номер> <цвет>');
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      const teamIndex = parseInt(ctx.match[1], 10) - 1;
      const requestedColor = (ctx.match[2] || '').trim();
      const color = resolveAllowedColor(requestedColor);

      if (teamIndex < 0 || teamIndex > 3) {
        const message = await ctx.reply('⚠️ Номер команды должен быть от 1 до 4.');
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      if (!color) {
        const message = await ctx.reply(`⚠️ Недопустимый цвет. Доступные цвета: ${ALLOWED_TEAM_COLORS.join(' ')}`);
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      GlobalState.setTeamColor(teamIndex, color);

      const message = await ctx.reply(
        `✅ Цвет команды изменён:\nКоманда ${teamIndex + 1} → ${color}`,
      );
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    } catch (error) {
      console.error('Ошибка в команде tc:', error.message);
      const message = await ctx.reply('⚠️ Произошла ошибка при изменении цвета команды.');
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
  });

  bot.hears(/^tc\s+reset$/i, async (ctx) => {
    try {
      if (!ctx.from || typeof ctx.from.id !== 'number') {
        console.error('Ошибка: некорректный ctx.from в команде tc reset');
        return;
      }
      if (!ctx.chat || typeof ctx.chat.id !== 'number') {
        console.error('Ошибка: некорректный ctx.chat в команде tc reset');
        return;
      }

      const ADMIN_ID = GlobalState.getAdminId();
      if (!Array.isArray(ADMIN_ID)) {
        console.error('Ошибка: ADMIN_ID не является массивом');
        return;
      }

      if (ctx.chat.id < 0) {
        const message = await ctx.reply('⚠️ Команда доступна только в личных сообщениях с ботом.');
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      await ctx.deleteMessage().catch(() => {});

      if (!ADMIN_ID.includes(ctx.from.id)) {
        const message = await ctx.reply('⛔ У вас нет прав для этой команды.');
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      GlobalState.resetTeamColors();

      const defaults = DEFAULT_TEAM_COLORS.join(' ');
      const message = await ctx.reply(`✅ Цвета команд сброшены к значениям по умолчанию: ${defaults}`);
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    } catch (error) {
      console.error('Ошибка в команде tc reset:', error.message);
      const message = await ctx.reply('⚠️ Произошла ошибка при сбросе цветов команд.');
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
  });
};
