// Скрипт для создания тестового игрока с NULL значениями в БД
// Использование: node scripts/createTestPlayerInDB.js

require('dotenv').config();
const db = require('../database/database');

async function createTestPlayer() {
  try {
    console.log('🔧 Создание тестового игрока с NULL значениями...\n');

    // Создаем игрока с NULL значениями name и username
    const testPlayerId = 999999;
    
    // Удаляем игрока, если он уже существует
    await db.query('DELETE FROM players WHERE id = ?', [testPlayerId]);
    
    // Создаем игрока с NULL значениями
    await db.query(
      `INSERT INTO players (id, name, username, goals, assists, saves, gamesPlayed, wins, draws, losses, rating, mvp)
       VALUES (?, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0)`,
      [testPlayerId]
    );
    
    console.log(`✅ Тестовый игрок создан с ID: ${testPlayerId}`);
    console.log('   name: NULL');
    console.log('   username: NULL\n');
    
    // Проверяем, что игрок создан
    const [rows] = await db.query('SELECT * FROM players WHERE id = ?', [testPlayerId]);
    console.log('📋 Данные игрока в БД:');
    console.log(JSON.stringify(rows[0], null, 2));
    
    console.log('\n📝 Инструкция для проверки:');
    console.log('1. Запустите бота');
    console.log('2. Начните матч командой /start');
    console.log('3. Добавьте тестового игрока командой: +add TestPlayer999999');
    console.log('4. Или используйте команду +1test для добавления тестовых игроков');
    console.log('5. Завершите матч командой /end или e!');
    console.log('\n⚠️  Если исправления работают, бот не должен упасть даже если');
    console.log('   у игрока в БД NULL значения для name и username.');
    
  } catch (error) {
    console.error('❌ Ошибка при создании тестового игрока:', error);
  } finally {
    process.exit(0);
  }
}

createTestPlayer();
