const {
  handleGoalCommand,
  handleUndoGoalCommand,
  handleCancelGoalAction,
  handleGoalAction,
} = require('./goals');

const {
  handleAssistCommand,
  handleUndoAssistCommand,
  handleCancelAssistAction,
  handleAssistAction,
} = require('./assists');

const {
  handleSaveCommand,
  handleUndoSaveCommand,
  handleShowSavesMenu,
  handleSaveAction,
  handleCancelSaveMenu,
  handleCancelSaveAction,
  handleSavesMenuBack,
} = require('./saves');

const {
  handleManagementMenu,
  handleCancelGoalMenu,
  handleShowGoalsMenu,
  handleShowAssistsMenu,
  handleCancelAssistMenu,
  handleAssistsMenuBack,
  handleGoalsMenuBack,
  handleManagementBack,
  handleShowYellowCardsMenu,
  handleYellowCardAction,
} = require('./menus');

module.exports = (bot, GlobalState) => {
  // Команды для голов
  bot.hears(/^g(\d+)(\d+)$/i, async (ctx) => {
    await handleGoalCommand(ctx, GlobalState);
  });

  bot.hears(/^ug(\d+)(\d+)$/i, async (ctx) => {
    await handleUndoGoalCommand(ctx, GlobalState);
  });

  bot.action(/^cancel_goal_(\d+)_(\d+)$/, async (ctx) => {
    await handleCancelGoalAction(ctx, GlobalState);
  });

  bot.action(/^goal_(\d+)_(\d+)$/, async (ctx) => {
    await handleGoalAction(ctx, GlobalState);
  });

  // Команды для ассистов
  bot.hears(/^a(\d+)(\d+)$/i, async (ctx) => {
    await handleAssistCommand(ctx, GlobalState);
  });

  bot.hears(/^ua(\d+)(\d+)$/i, async (ctx) => {
    await handleUndoAssistCommand(ctx, GlobalState);
  });

  bot.action(/^cancel_assist_(\d+)_(\d+)$/, async (ctx) => {
    await handleCancelAssistAction(ctx, GlobalState);
  });

  bot.action(/^assist_(\d+)_(\d+)$/, async (ctx) => {
    await handleAssistAction(ctx, GlobalState);
  });

  // Команды для сейвов
  bot.hears(/^sv(\d+)(\d+)$/i, async (ctx) => {
    await handleSaveCommand(ctx, GlobalState);
  });

  bot.hears(/^usv(\d+)(\d+)$/i, async (ctx) => {
    await handleUndoSaveCommand(ctx, GlobalState);
  });

  bot.action('show_saves_menu', async (ctx) => {
    await handleShowSavesMenu(ctx, GlobalState);
  });

  bot.action(/^save_(\d+)_(\d+)$/, async (ctx) => {
    await handleSaveAction(ctx, GlobalState);
  });

  bot.action('cancel_save_menu', async (ctx) => {
    await handleCancelSaveMenu(ctx, GlobalState);
  });

  bot.action(/^cancel_save_(\d+)_(\d+)$/, async (ctx) => {
    await handleCancelSaveAction(ctx, GlobalState);
  });

  bot.action('saves_menu_back', async (ctx) => {
    await handleSavesMenuBack(ctx, GlobalState);
  });

  // Меню
  bot.action('management_menu', async (ctx) => {
    await handleManagementMenu(ctx, GlobalState);
  });

  bot.action('cancel_goal_menu', async (ctx) => {
    await handleCancelGoalMenu(ctx, GlobalState);
  });

  bot.action('show_goals_menu', async (ctx) => {
    await handleShowGoalsMenu(ctx, GlobalState);
  });

  bot.action('show_assists_menu', async (ctx) => {
    await handleShowAssistsMenu(ctx, GlobalState);
  });

  bot.action('cancel_assist_menu', async (ctx) => {
    await handleCancelAssistMenu(ctx, GlobalState);
  });

  bot.action('assists_menu_back', async (ctx) => {
    await handleAssistsMenuBack(ctx, GlobalState);
  });

  bot.action('goals_menu_back', async (ctx) => {
    await handleGoalsMenuBack(ctx, GlobalState);
  });

  bot.action('management_back', async (ctx) => {
    await handleManagementBack(ctx, GlobalState);
  });

  bot.action('show_yellow_cards_menu', async (ctx) => {
    await handleShowYellowCardsMenu(ctx, GlobalState);
  });

  bot.action(/^yellow_card_(\d+)_(\d+)$/, async (ctx) => {
    await handleYellowCardAction(ctx, GlobalState);
  });
};
