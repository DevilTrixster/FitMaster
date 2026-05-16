-- Добавляем колонку уровня опыта
ALTER TABLE users ADD COLUMN experience_level VARCHAR(20) DEFAULT 'novice';
-- Добавляем колонку цели тренировок
ALTER TABLE users ADD COLUMN fitness_goal VARCHAR(50) DEFAULT 'maintenance';