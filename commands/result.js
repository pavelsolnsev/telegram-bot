
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");

module.exports = (bot, GlobalState) => {
  const teamColors = ["🔴", "🔵", "🟢", "🟡"];

  const formatPlayerLine = (idx, { name, goals }) => {
    const index = String(idx + 1).padStart(2, " ") + ".";
    const cleanName = name
      .replace(/([\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}])/gu, '')
      .trim();
    const chars = Array.from(cleanName);
    const displayName = chars.length <= 11
      ? cleanName
      : chars.slice(0, 8).join("") + "...";
    const goalsMark = goals > 0 ? ` ⚽️${goals}` : "";
    return `${index}${displayName}${goalsMark}`;
  };

  bot.hears(/^результаты$/i, async (ctx) => {

    await ctx.deleteMessage().catch(() => {});

    if (ctx.chat.id < 0) {
      const msg = await ctx.reply("Напиши мне в ЛС.");
      return deleteMessageAfterDelay(ctx, msg.message_id);
    }

    const results = GlobalState.getMatchResults();

    if (results.length === 0) {
      const msg = await ctx.reply("📋 Пока нет сыгранных матчей.");
      deleteMessageAfterDelay(ctx, msg.message_id);
      return;
    }

    // Собираем текст сообщения
    const sections = results.map((m, i) => {
      const color1 = teamColors[m.teamIndex1] || "⚽";
      const color2 = teamColors[m.teamIndex2] || "⚽";
      const title = `✅ 🏁 Итог матча №${i + 1} 🏁`;
      const lines1 = m.players1.map((pl, idx) => formatPlayerLine(idx, pl)).join("\n");
      const lines2 = m.players2.map((pl, idx) => formatPlayerLine(idx, pl)).join("\n");
      const scoreLine = `📊 Счет: ${color1} ${m.score1}:${m.score2} ${color2}`;
      const resultText =
        m.score1 > m.score2
          ? `🏆 ${color1} побеждает!`
          : m.score2 > m.score1
          ? `🏆 ${color2} побеждает!`
          : "🤝 Ничья!";

      return [
        title,
        "",
        `${color1} Команда ${m.teamIndex1 + 1}`,
        `<code>${lines1}</code>`,
        "",
        `${color2} Команда ${m.teamIndex2 + 1}`,
        `<code>${lines2}</code>`,
        "",
        scoreLine,
        "",
        resultText,
      ].join("\n");
    });

    const text = sections.join("\n\n===============\n\n");
    const last = GlobalState.getLastResultMessageId();

    if (last && last.chatId && last.messageId) {
      try {
        await ctx.telegram.editMessageText(
          last.chatId,
          last.messageId,
          null,
          text,
          { parse_mode: "HTML" }
        );
        deleteMessageAfterDelay(ctx, last.messageId, 120000);
      } catch (err) {
        const desc = err?.response?.description || '';
        if (desc.includes('message to edit not found')) {
          const sent = await ctx.reply(text, { parse_mode: 'HTML' });
          GlobalState.setLastResultMessageId(sent.chat.id, sent.message_id);
          deleteMessageAfterDelay(ctx, sent.message_id, 120000);
        } else if (!desc.includes('message is not modified')) {
          console.error('Ошибка редактирования результата:', err);
        }
      }
    } else {
      const sent = await ctx.reply(text, { parse_mode: 'HTML' });
      GlobalState.setLastResultMessageId(sent.chat.id, sent.message_id);
      deleteMessageAfterDelay(ctx, sent.message_id, 120000);
    }
  });
};
