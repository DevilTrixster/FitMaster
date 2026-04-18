-- Расширяем таблицу user_workouts для поддержки переноса и пропуска
ALTER TABLE user_workouts 
ADD COLUMN IF NOT EXISTS rescheduled_to DATE,
ADD COLUMN IF NOT EXISTS reschedule_reason TEXT;

-- Примечание: столбец status уже имеет тип VARCHAR(20)