const { GlobalState } = require('../store');
const { Markup } = require('telegraf');

// ========================================
// 🧩 Гибкая структура локаций
// ========================================
const locations = {
  kz: {
    name: 'Красное Знамя',
    address:
      'Московская область, г. Раменское, ул. Воровского, д.4A (Красное Знамя - Спортивный зал)',
    link: 'https://yandex.ru/maps/-/CLuPMJ3L',
    route:
      'https://yandex.ru/maps/?mode=routes&rtext=~55.574202,38.205299&rtt=auto',
    sum: 400,
    limit: 20,
    blocks: [
      'date',
      'location',
      'payment',
      'instructions',
      'players',
      'queue',
      'summary',
    ],
  },

  prof: {
    name: 'Профилакторий',
    address:
      'Московская область, г. Раменское, ул. Махова, д.18. (Профилакторий)',
    link: 'https://yandex.ru/maps/-/CHfBZ-mH',
    route:
      'https://yandex.ru/maps/?mode=routes&rtext=~55.578414,38.219605&rtt=auto',
    sum: 400,
    limit: 20,
    blocks: [
      'date',
      'location',
      'payment',
      'instructions',
      'players',
      'queue',
      'summary',
    ],
  },

  saturn: {
    name: 'Сатурн',
    address:
      'Московская область, г. Раменское, ул. Народное Имение, 6А (Стадион Сатурн - спорт зал)',
    link: 'https://yandex.ru/maps/-/CLBZ4H~9',
    route:
      'https://yandex.ru/maps/?mode=routes&rtext=~55.578216,38.226238&rtt=auto',
    sum: 600,
    limit: 10,
    blocks: [
      'date',
      'location',
      'payment',
      'instructions',
      'players',
      'queue',
      'summary',
    ],
  },

  tr: {
    name: 'Турнир',
    address:
      'Московская область, г. Раменское, ул. Воровского, д.4A (Красное Знамя - Спортивный зал)',
    link: 'https://yandex.ru/maps/-/CLuPMJ3L',
    route:
      'https://yandex.ru/maps/?mode=routes&rtext=~55.574202,38.205299&rtt=auto',
    limit: 20,
    extraInfo: [
      '<b>Запись:</b> Только для участников турнира.',
      '<b>Формат:</b> В 3 круга каждый с каждым',
      '<b>Время:</b> 2 часа',
    ],
    blocks: [
      'date',
      'tournamentTitle',
      'location',
      'extra',
      'instructions',
      'players',
      'queue',
      'summary',
    ],
  },
};

function formatDateBlock(collectionDate) {
  if (!collectionDate) return '🕒 <b>Дата и время сбора не указаны!</b>\n\n';

  const options = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'long',
  };
  const formattedDate = collectionDate.toLocaleString('ru-RU', options);
  const [weekday, date, time] = formattedDate.split(', ');
  return `🕒 <b>${
    weekday.charAt(0).toUpperCase() + weekday.slice(1)
  }, ${date.replace(' г.', '')}, ${time}</b>\n\n`;
}

function formatLocationBlock(loc) {
  return (
    `🏟 <b>Адрес:</b> <a href="${loc.link}">${loc.address}</a>\n` +
    `📍 <b>Маршрут:</b> <a href="${loc.route}">Построить маршрут</a>\n` +
    (loc.sum
      ? `💰 <b>Стоимость: ${loc.sum} ₽</b> (аренда поля, съёмка, манишки, мячи, аптечка, музыка, вода)\n`
      : '')
  );
}

function formatPaymentBlock() {
  return (
    '💸 <b>Оплата:</b>\n' +
    '- <b>Перевод СБЕРБАНК</b> (Павел С.):\n' +
    '📱 <a href="tel:89166986185"><code>89166986185</code></a>\n' +
    '🔗 <a href="https://messenger.online.sberbank.ru/sl/JWnaTcQf0aviSEAxy">Оплатить участие</a>\n' +
    '❗ <b>Укажите в комментарии к переводу ваш ник из списка на игру</b>\n' +
    '- <b>Наличные:</b> На месте\n'
  );
}

function formatPlayerName(name, maxLength = 12) {
  // Проверка на null/undefined и приведение к строке
  if (!name || (typeof name !== 'string' && typeof name !== 'number')) {
    return 'Unknown'.padEnd(maxLength, ' ');
  }

  const nameStr = String(name);
  // Удаляем эмодзи и декоративные Unicode-символы:
  // - Эмодзи (1F000-1FFFF, 2600-27BF, FE00-FEFF, 1F600-1F64F, 1F680-1F6FF, 1F900-1F9FF)
  // - Математические алфавитные символы (1D400-1D7FF) - декоративные буквы
  // - Полноширинные символы (FF00-FFEF)
  // eslint-disable-next-line no-misleading-character-class
  const emojiRegex = /[\u{1F000}-\u{1FFFF}\u{1D400}-\u{1D7FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FEFF}\u{FF00}-\u{FFEF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/gu;
  const cleanName = nameStr.replace(emojiRegex, '').trim();

  // Если после очистки имя пустое, возвращаем дефолтное значение
  if (!cleanName) {
    return 'Unknown'.padEnd(maxLength, ' ');
  }

  const chars = Array.from(cleanName);
  if (chars.length <= maxLength) return cleanName.padEnd(maxLength, ' ');
  return chars.slice(0, maxLength - 3).join('') + '...';
}

function formatPlayerLine(index, name, rating, paid) {
  const paidMark = paid ? ' ✅' : '';
  const paddedIndex = (index + 1).toString().padStart(2, ' ') + '.';
  const paddedName = formatPlayerName(name).padEnd(12, ' ');
  const formattedRating = parseFloat(rating).toString();
  let ratingIcon;
  if (rating < 10) ratingIcon = '⭐';
  else if (rating < 30) ratingIcon = '💫';
  else if (rating < 60) ratingIcon = '✨';
  else if (rating < 100) ratingIcon = '🌠';
  else if (rating < 150) ratingIcon = '💎';
  else ratingIcon = '🏆';
  return `${paddedIndex}${paddedName} ${ratingIcon}${formattedRating}${paidMark}`;
}

const blockRenderers = {
  date: (collectionDate) => formatDateBlock(collectionDate),

  location: (_, loc) => formatLocationBlock(loc),

  tournamentTitle: () => '🏆 <b>⚡ ТУРНИР РФОИ ⚡</b>\n\n',

  payment: (_, loc) => (loc.sum ? formatPaymentBlock() : ''),

  extra: (_, loc) => {
    const referee = GlobalState.getReferee?.();
    const extraLines = loc.extraInfo ? [...loc.extraInfo] : [];
    if (referee) extraLines.push(`<b>Судья:</b> ${referee}`);
    return extraLines.length
      ? '\n📜 <b>Информация для игроков:</b>\n' +
          extraLines.map((l) => `- ${l}`).join('\n') +
          '\n'
      : '';
  },

  custom: (_, loc) =>
    loc.customInfo?.length
      ? '\n🧾 <b>Дополнительная информация:</b>\n' +
        loc.customInfo.map((l) => `- ${l}`).join('\n') +
        '\n'
      : '',

  instructions: () =>
    '\n🌐 <b>Рейтинг игроков:</b> <a href="https://football.pavelsolntsev.ru">football.pavelsolntsev.ru</a>\n' +
    '🏆 <b>Список команд:</b> <a href="https://football.pavelsolntsev.ru/tournament/">football.pavelsolntsev.ru/tournament</a>\n' +
    'ℹ️ <b>Информация:</b> <a href="https://football.pavelsolntsev.ru/info">football.pavelsolntsev.ru/info</a>\n' +
    '📣 <b>Группа ВКонтакте:</b> <a href="https://vk.com/rmsfootball">VK RmsFootball</a>\n\n' +
    '🕹 <b>Управление записью:</b>\n' +
    "- <b>Записаться:</b> Напишите '+' или нажмите '⚽ Играть'\n" +
    "- <b>Выйти:</b> Напишите '-' или нажмите '🚶 Выйти'\n",

  players: (_, __, players) =>
    players.length
      ? '\n🏆 <b>В игре:</b>\n<code>' +
        players
          .map((p, i) =>
            formatPlayerLine(i, p.username || p.name || `Player${i + 1}`, p.rating, p.paid),
          )
          .join('\n') +
        '</code>\n'
      : '',

  queue: (_, __, ___, queue) =>
    queue.length
      ? '\n📢 <b>Очередь игроков:</b>\n<code>' +
        queue
          .map((p, i) =>
            formatPlayerLine(i, p.username || p.name || `Player${i + 1}`, p.rating, p.paid),
          )
          .join('\n') +
        '</code>\n'
      : '',

  summary: (_, __, ___, ____, players, maxPlayers) =>
    `\n📋 <b>Список игроков:</b> ${players.length} / ${maxPlayers}\n`,
};

const sendPlayerList = async (ctx, chatId = null) => {
  const collectionDate = GlobalState.getCollectionDate();
  const players = GlobalState.getPlayers();
  const queue = GlobalState.getQueue();
  const location = GlobalState.getLocation();
  const MaxPlayers = GlobalState.getMaxPlayers();

  const loc = locations[location] || locations.prof;

  const formattedList = loc.blocks
    .map(
      (blockName) =>
        blockRenderers[blockName]?.(
          collectionDate,
          loc,
          players,
          queue,
          players,
          MaxPlayers,
        ) || '',
    )
    .join('');

  const inlineKeyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('⚽ Играть', 'join_match'),
      Markup.button.callback('🚶 Выйти', 'leave_match'),
    ],
  ]);

  const messageOptions = {
    parse_mode: 'HTML',
    reply_markup: inlineKeyboard.reply_markup,
    disable_web_page_preview: true,
  };

  try {
    const listChat =
      GlobalState.getListMessageChatId() || chatId || ctx.chat.id;
    const msgId = GlobalState.getListMessageId();

    if (msgId) {
      await ctx.telegram.editMessageText(
        listChat,
        msgId,
        null,
        formattedList,
        messageOptions,
      );
    } else {
      const sent = await ctx.telegram.sendMessage(
        listChat,
        formattedList,
        messageOptions,
      );
      GlobalState.setListMessageId(sent.message_id);
      GlobalState.setListMessageChatId(sent.chat.id);
    }
  } catch (error) {
    if (error.description?.includes('message to edit not found')) {
      const sent = await ctx.telegram.sendMessage(
        chatId || ctx.chat.id,
        formattedList,
        messageOptions,
      );
      GlobalState.setListMessageId(sent.message_id);
      GlobalState.setListMessageChatId(sent.chat.id);
    } else if (error.description?.includes('message is not modified')) {
      console.log('Сообщение не изменилось — пропускаем обновление.');
    } else {
      console.error('Ошибка при отправке списка:', error);
    }
  }
};

module.exports = { sendPlayerList, locations };
