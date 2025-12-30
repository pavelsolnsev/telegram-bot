-- ФИНАЛЬНЫЙ ВАРИАНТ: Создание таблиц для команд
-- Убедитесь, что таблица teams создана ПЕРЕД созданием team_players
-- ВАЖНО: Используется движок InnoDB для поддержки внешних ключей

-- ШАГ 1: Создание таблицы teams (если еще не создана)
CREATE TABLE IF NOT EXISTS teams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  tournament_count INT DEFAULT 0,
  points INT DEFAULT 0,
  wins INT DEFAULT 0,
  draws INT DEFAULT 0,
  losses INT DEFAULT 0,
  goals_scored INT DEFAULT 0,
  goals_conceded INT DEFAULT 0,
  trophies INT DEFAULT 0,
  UNIQUE KEY unique_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ШАГ 2: Создание таблицы team_players
-- Тип player_id: BIGINT UNSIGNED (соответствует players.id)
CREATE TABLE IF NOT EXISTS team_players (
  team_id INT NOT NULL,
  player_id BIGINT UNSIGNED NOT NULL,
  team_name VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(255),
  tournament_count INT DEFAULT 0,
  is_captain TINYINT(1) DEFAULT 0,
  is_main_player TINYINT(1) DEFAULT 0,
  PRIMARY KEY (team_id, player_id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- ДОБАВЛЕНИЕ ПОЛЕЙ В СУЩЕСТВУЮЩИЕ ТАБЛИЦЫ
-- Используйте эти команды, если таблицы уже созданы
-- Выполняйте команды по отдельности или все вместе
-- ============================================

-- 1. Добавление поля trophies в таблицу teams
-- (количество трофеев - побед в турнирах)
ALTER TABLE teams 
ADD COLUMN trophies INT DEFAULT 0 AFTER goals_conceded;

-- 2. Добавление поля tournament_count в таблицу team_players
-- (количество турниров, которые игрок сыграл за эту команду)
ALTER TABLE team_players 
ADD COLUMN tournament_count INT DEFAULT 0 AFTER username;

-- 3. Добавление поля is_captain в таблицу team_players
-- (флаг капитана команды: 1 = капитан, 0 = не капитан)
ALTER TABLE team_players 
ADD COLUMN is_captain TINYINT(1) DEFAULT 0 AFTER tournament_count;

-- 4. Добавление поля is_main_player в таблицу team_players
-- (флаг основного игрока: 1 = основной игрок, 0 = не основной)
ALTER TABLE team_players 
ADD COLUMN is_main_player TINYINT(1) DEFAULT 0 AFTER is_captain;
