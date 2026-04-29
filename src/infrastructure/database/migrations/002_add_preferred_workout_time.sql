-- Добавляем поле предпочтительного времени тренировки
ALTER TABLE users
ADD COLUMN IF NOT EXISTS preferred_workout_time VARCHAR(5);

-- Пример: '17:00' для 5 вечера