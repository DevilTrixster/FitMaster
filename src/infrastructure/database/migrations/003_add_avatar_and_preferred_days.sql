-- Добавление колонки avatar_url
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

-- Добавление колонки preferred_days (массив целых чисел, 1=Пн ... 7=Вс)
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_days INTEGER[] DEFAULT ARRAY[1,3,5];

-- Для существующих пользователей установить значение по умолчанию, если NULL
UPDATE users SET preferred_days = ARRAY[1,3,5] WHERE preferred_days IS NULL;

-- (Опционально) Добавить колонку preferred_workout_time, если её нет
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_workout_time TIME DEFAULT '17:00:00';