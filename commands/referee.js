const { deleteMessageAfterDelay } = require('../utils/deleteMessageAfterDelay');
const { sendPlayerList } = require('../utils/sendPlayerList');

module.exports = (bot, GlobalState) => {
  if (!GlobalState.getReferee) {
    let referee = 'Карен';
    GlobalState.getReferee = () => referee;
    GlobalState.setReferee = (name) => referee = name;
    GlobalState.resetReferee = () => referee = 'Карен';
  }

  // Команда "судья <имя>"
  bot.hears(/^ref\s*(.*)$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const isAdmin = ADMIN_ID.includes(ctx.from.id);
    const currentLocation = GlobalState.getLocation();

    await ctx.deleteMessage().catch(() => {});

    // Проверка на права
    if (!isAdmin) {
      const message = await ctx.reply('⛔ У вас нет прав для этой команды.');
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    // Проверка на категорию
    if (currentLocation !== 'tr') {
      const message = await ctx.reply('⚠️ Команда доступна только в режиме турнира!');
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    // Извлекаем имя судьи
    const input = ctx.message.text.trim();
    const match = input.match(/^ref\s*(.*)$/i);
    const newName = match && match[1] ? match[1].trim() : null;

    // Если имя не указано — показать текущего судью
    if (!newName) {
      const currentReferee = GlobalState.getReferee();
      const message = await ctx.reply(`👨‍⚖️ Текущий судья: ${currentReferee}`);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    // Установка нового имени
    GlobalState.setReferee(newName);
    const message = await ctx.reply(`✅ Судья установлен: ${newName}`);

    // Обновляем список в группе
    await sendPlayerList(ctx, GlobalState.getListMessageChatId());
    deleteMessageAfterDelay(ctx, message.message_id, 6000);
  });
};

