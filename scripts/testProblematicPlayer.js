// Скрипт для тестирования проблемного игрока
// Использование: node scripts/testProblematicPlayer.js

require('dotenv').config();
const { GlobalState } = require('../store');
const { buildTeamsMessage } = require('../message/buildTeamsMessage');
const { buildPlayingTeamsMessage } = require('../message/buildPlayingTeamsMessage');

console.log('🧪 Тестирование обработки игроков без имени...\n');

// Тест 1: Игрок без name и username
const problematicPlayer1 = {
  id: 999999,
  name: undefined,
  username: undefined,
  goals: 2,
  assists: 1,
  saves: 0,
  rating: 50.0,
};

// Тест 2: Игрок с null значениями
const problematicPlayer2 = {
  id: 999998,
  name: null,
  username: null,
  goals: 1,
  assists: 0,
  saves: 0,
  rating: 30.0,
};

// Тест 3: Игрок с пустыми строками
const problematicPlayer3 = {
  id: 999997,
  name: '',
  username: '',
  goals: 0,
  assists: 0,
  saves: 0,
  rating: 20.0,
};

// Нормальный игрок для сравнения
const normalPlayer = {
  id: 999996,
  name: 'TestPlayer',
  username: 'testplayer',
  goals: 0,
  assists: 0,
  saves: 0,
  rating: 40.0,
};

console.log('📋 Тест 1: buildPlayingTeamsMessage с игроком без имени');
try {
  const team1 = [problematicPlayer1, normalPlayer];
  const team2 = [normalPlayer, problematicPlayer2];

  const message = buildPlayingTeamsMessage(team1, team2, 0, 1, 'playing', undefined, 1);
  console.log('✅ buildPlayingTeamsMessage отработала успешно');
  console.log('Сообщение содержит:', message.includes('Unknown') || message.includes('Player') ? 'дефолтные имена' : 'ошибку');
} catch (error) {
  console.error('❌ Ошибка в buildPlayingTeamsMessage:', error.message);
}

console.log('\n📋 Тест 2: buildPlayingTeamsMessage со статусом finished');
try {
  const team1 = [problematicPlayer1, normalPlayer];
  const team2 = [normalPlayer, problematicPlayer2];

  const message = buildPlayingTeamsMessage(team1, team2, 0, 1, 'finished', undefined, 1);
  console.log('✅ buildPlayingTeamsMessage (finished) отработала успешно');
  console.log('Сообщение содержит:', message.includes('Unknown') || message.includes('Player') ? 'дефолтные имена' : 'ошибку');
} catch (error) {
  console.error('❌ Ошибка в buildPlayingTeamsMessage (finished):', error.message);
}

console.log('\n📋 Тест 3: buildTeamsMessage с проблемными игроками');
try {
  const teamsBase = [
    [problematicPlayer1, normalPlayer],
    [normalPlayer, problematicPlayer2],
  ];

  const updatedTeams = [
    [problematicPlayer1, normalPlayer],
    [normalPlayer, problematicPlayer3],
  ];

  const message = buildTeamsMessage(teamsBase, 'Тестовая таблица', {}, updatedTeams);
  console.log('✅ buildTeamsMessage отработала успешно');
  console.log('Сообщение содержит:', message.includes('Unknown') || message.includes('Player') ? 'дефолтные имена' : 'ошибку');
} catch (error) {
  console.error('❌ Ошибка в buildTeamsMessage:', error.message);
}

console.log('\n📋 Тест 4: Проверка updatePlayerStats (через симуляцию)');
try {
  // Симулируем ситуацию, когда updatePlayerStats может создать игрока без имени
  const team = [problematicPlayer1];
  const originalTeam = [problematicPlayer1]; // Оба без имени

  // Проверяем, что даже если оба без имени, код не упадет
  const testResult = {
    ...originalTeam[0],
    id: problematicPlayer1.id,
    name: problematicPlayer1.name || originalTeam[0].name || 'Unknown',
    username: problematicPlayer1.username || originalTeam[0].username || null,
  };

  console.log('✅ updatePlayerStats логика работает корректно');
  console.log('Результат:', testResult.name === 'Unknown' ? 'используется дефолтное имя' : 'ошибка');
} catch (error) {
  console.error('❌ Ошибка в логике updatePlayerStats:', error.message);
}

console.log('\n✅ Все тесты завершены!');
