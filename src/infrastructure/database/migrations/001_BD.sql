-- =====================================================
-- FitMaster – Полная схема базы данных (финальная версия)
-- Поддержка: аватар, выбор дней недели, лайки/дизлайки
-- =====================================================

-- 1. Удаление всех таблиц (CASCADE удалит зависимые объекты)
DROP TABLE IF EXISTS exercise_likes CASCADE;
DROP TABLE IF EXISTS fatigue_recovery CASCADE;
DROP TABLE IF EXISTS muscle_recovery CASCADE;
DROP TABLE IF EXISTS workout_adaptations CASCADE;
DROP TABLE IF EXISTS set_metrics CASCADE;
DROP TABLE IF EXISTS exercise_sets CASCADE;
DROP TABLE IF EXISTS user_workouts CASCADE;
DROP TABLE IF EXISTS workout_exercises CASCADE;
DROP TABLE IF EXISTS exercise_metric_templates CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;
DROP TABLE IF EXISTS workouts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. ENUM типы (создаются только если отсутствуют)
DO $$ BEGIN
    CREATE TYPE gender_type AS ENUM ('male', 'female');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE workout_status_type AS ENUM (
        'scheduled', 'in_progress', 'paused',
        'completed', 'skipped', 'rescheduled'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE adaptation_type AS ENUM (
        'increase_weight', 'decrease_weight',
        'increase_reps', 'decrease_reps',
        'no_change', 'substitution'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE metric_type AS ENUM (
        'reps', 'weight', 'duration', 'distance',
        'calories', 'incline', 'resistance'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 3. СОЗДАНИЕ ТАБЛИЦ
-- =====================================================

-- Пользователи (расширено: avatar_url, preferred_days)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    nickname VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    birth_date DATE NOT NULL,
    gender gender_type NOT NULL DEFAULT 'male',
    height INTEGER NOT NULL CHECK (height > 100 AND height < 250),
    weight DECIMAL(5,2) NOT NULL CHECK (weight > 30 AND weight < 300),
    preferred_workout_time TIME DEFAULT '17:00:00',
    avatar_url VARCHAR(500),
    preferred_days INTEGER[] DEFAULT ARRAY[1,3,5],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Программы тренировок
CREATE TABLE workouts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    frequency_per_week INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Упражнения
CREATE TABLE exercises (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    muscle_group VARCHAR(50) NOT NULL,
    equipment_type VARCHAR(50) DEFAULT 'bodyweight',
    is_active BOOLEAN DEFAULT TRUE,
    fatigue_index NUMERIC(3,1) DEFAULT 5.0,
    stimulus_index NUMERIC(3,1) DEFAULT 5.0,
    injury_risk NUMERIC(3,1) DEFAULT 1.0,
    skill_requirement NUMERIC(3,1) DEFAULT 1.0,
    recovery_cost NUMERIC(3,1) DEFAULT 5.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Шаблоны метрик упражнений
CREATE TABLE exercise_metric_templates (
    id SERIAL PRIMARY KEY,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    metric_type metric_type NOT NULL,
    required BOOLEAN DEFAULT TRUE,
    default_value DECIMAL(10,2),
    unit VARCHAR(20),
    UNIQUE(exercise_id, metric_type)
);

-- Связь упражнений с программами
CREATE TABLE workout_exercises (
    id SERIAL PRIMARY KEY,
    workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
    sets INTEGER NOT NULL CHECK (sets > 0 AND sets <= 10),
    rest_seconds INTEGER DEFAULT 60 CHECK (rest_seconds >= 0),
    order_index INTEGER NOT NULL CHECK (order_index > 0),
    UNIQUE(workout_id, exercise_id, order_index)
);

-- Пользовательские тренировки (события в календаре)
CREATE TABLE user_workouts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME DEFAULT '17:00:00',
    status workout_status_type DEFAULT 'scheduled',
    started_at TIMESTAMP,
    paused_at TIMESTAMP,
    completed_at TIMESTAMP,
    last_exercise_index INTEGER DEFAULT 0,
    wellness_rating INTEGER CHECK (wellness_rating >= 1 AND wellness_rating <= 5),
    comments TEXT,
    rescheduled_to DATE,
    reschedule_reason TEXT,
    planned_difficulty INTEGER DEFAULT 7,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Подходы
CREATE TABLE exercise_sets (
    id SERIAL PRIMARY KEY,
    workout_exercise_id INTEGER NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL CHECK (set_number > 0),
    set_type VARCHAR(50) NOT NULL DEFAULT 'normal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workout_exercise_id, set_number)
);

-- Метрики подходов
CREATE TABLE set_metrics (
    id SERIAL PRIMARY KEY,
    exercise_set_id INTEGER NOT NULL REFERENCES exercise_sets(id) ON DELETE CASCADE,
    metric_type metric_type NOT NULL,
    value NUMERIC(10,2) NOT NULL,
    unit VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- История адаптаций нагрузки
CREATE TABLE workout_adaptations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    user_workout_id INTEGER REFERENCES user_workouts(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
    previous_weight DECIMAL(5,2),
    new_weight DECIMAL(5,2),
    previous_reps INTEGER,
    new_reps INTEGER,
    adaptation_type VARCHAR(50) NOT NULL DEFAULT 'no_change',
    adaptation_reason VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ежедневные метрики утомления и восстановления
CREATE TABLE fatigue_recovery (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    fatigue_score NUMERIC(5,2) CHECK (fatigue_score >= 0 AND fatigue_score <= 100),
    recovery_score NUMERIC(5,2) CHECK (recovery_score >= 0 AND recovery_score <= 100),
    performance_trend NUMERIC(5,2),
    adaptation_rate NUMERIC(5,2),
    injury_risk NUMERIC(5,2),
    raw_data JSONB,
    UNIQUE(user_id, date)
);

-- Восстановление отдельных мышечных групп
CREATE TABLE muscle_recovery (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    muscle_group VARCHAR(50) NOT NULL,
    last_trained_date DATE,
    recovery_percentage NUMERIC(5,2) DEFAULT 100,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, muscle_group)
);

-- Лайки / дизлайки упражнений
CREATE TABLE exercise_likes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    liked BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, exercise_id)
);

-- =====================================================
-- 4. ИНДЕКСЫ
-- =====================================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_nickname ON users(nickname);
CREATE INDEX idx_user_workouts_user_id ON user_workouts(user_id);
CREATE INDEX idx_user_workouts_status ON user_workouts(status);
CREATE INDEX idx_user_workouts_scheduled_date ON user_workouts(scheduled_date);
CREATE INDEX idx_user_workouts_user_date ON user_workouts(user_id, scheduled_date DESC);
CREATE INDEX idx_user_workouts_completed ON user_workouts(user_id, completed_at DESC) WHERE completed_at IS NOT NULL;
CREATE INDEX idx_workout_adaptations_user_id ON workout_adaptations(user_id);
CREATE INDEX idx_workout_adaptations_exercise_id ON workout_adaptations(exercise_id);
CREATE INDEX idx_workout_adaptations_user_exercise ON workout_adaptations(user_id, exercise_id, created_at DESC);
CREATE INDEX idx_set_metrics_exercise_set ON set_metrics(exercise_set_id);
CREATE INDEX idx_exercise_sets_workout_exercise ON exercise_sets(workout_exercise_id);
CREATE INDEX idx_fatigue_recovery_user_date ON fatigue_recovery(user_id, date DESC);
CREATE INDEX idx_muscle_recovery_user ON muscle_recovery(user_id);
CREATE INDEX idx_exercise_likes_user ON exercise_likes(user_id);
CREATE INDEX idx_exercise_likes_exercise ON exercise_likes(exercise_id);

-- =====================================================
-- 5. ТРИГГЕРЫ ДЛЯ updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workouts_updated_at BEFORE UPDATE ON workouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON exercises FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_workouts_updated_at BEFORE UPDATE ON user_workouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exercise_likes_updated_at BEFORE UPDATE ON exercise_likes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. БАЗОВЫЕ ДАННЫЕ (упражнения, шаблоны, программы)
-- =====================================================

-- Упражнения
INSERT INTO exercises (id, name, description, muscle_group, equipment_type) VALUES
(1, 'Приседания со штангой', 'Базовое упражнение для ног.', 'legs', 'barbell'),
(2, 'Выпады', 'Упражнение для ног с собственным весом.', 'legs', 'bodyweight'),
(3, 'Подъём на носки', 'Упражнение для икроножных мышц.', 'legs', 'bodyweight'),
(4, 'Становая тяга', 'Базовое упражнение для задней цепи.', 'legs', 'barbell'),
(5, 'Жим лёжа', 'Базовое упражнение для грудных мышц.', 'chest', 'barbell'),
(6, 'Отжимания', 'Упражнение для груди с собственным весом.', 'chest', 'bodyweight'),
(7, 'Жим гантелей', 'Упражнение для груди с гантелями.', 'chest', 'dumbbell'),
(8, 'Тяга штанги в наклоне', 'Упражнение для широчайших мышц спины.', 'back', 'barbell'),
(9, 'Подтягивания', 'Базовое упражнение для спины.', 'back', 'bodyweight'),
(10, 'Тяга верхнего блока', 'Упражнение для спины на тренажёре.', 'back', 'cable'),
(11, 'Жим над головой', 'Базовое упражнение для плеч.', 'shoulders', 'barbell'),
(12, 'Махи гантелями в стороны', 'Изолирующее упражнение для средних дельт.', 'shoulders', 'dumbbell'),
(13, 'Подъём на бицепс', 'Упражнение для бицепса.', 'arms', 'barbell'),
(14, 'Французский жим', 'Упражнение для трицепса.', 'arms', 'barbell'),
(15, 'Планка', 'Статическое упражнение для кора.', 'core', 'bodyweight'),
(16, 'Скручивания', 'Упражнение для прямой мышцы живота.', 'core', 'bodyweight');

-- Шаблоны метрик
INSERT INTO exercise_metric_templates (exercise_id, metric_type, required, default_value, unit) VALUES
(1, 'reps', true, 10, 'count'), (1, 'weight', true, 80, 'kg'),
(4, 'reps', true, 8, 'count'), (4, 'weight', true, 100, 'kg'),
(5, 'reps', true, 10, 'count'), (5, 'weight', true, 60, 'kg'),
(7, 'reps', true, 10, 'count'), (7, 'weight', true, 40, 'kg'),
(8, 'reps', true, 10, 'count'), (8, 'weight', true, 50, 'kg'),
(10, 'reps', true, 10, 'count'), (10, 'weight', true, 45, 'kg'),
(11, 'reps', true, 10, 'count'), (11, 'weight', true, 40, 'kg'),
(12, 'reps', true, 12, 'count'), (12, 'weight', true, 20, 'kg'),
(13, 'reps', true, 10, 'count'), (13, 'weight', true, 30, 'kg'),
(14, 'reps', true, 10, 'count'), (14, 'weight', true, 25, 'kg'),
(2, 'reps', true, 12, 'count'),
(3, 'reps', true, 15, 'count'),
(6, 'reps', true, 15, 'count'),
(9, 'reps', true, 8, 'count'),
(16, 'reps', true, 20, 'count'),
(15, 'duration', true, 60, 'sec');

-- Программы тренировок
INSERT INTO workouts (id, name, description, frequency_per_week) VALUES
(1, 'День НОГ', 'Акцент на ноги, икры и кор.', 3),
(2, 'День ГРУДИ', 'Акцент на грудь, плечи и трицепс.', 3),
(3, 'День СПИНЫ', 'Акцент на спину, бицепс и заднюю дельту.', 3);

-- Упражнения в программах
INSERT INTO workout_exercises (workout_id, exercise_id, sets, rest_seconds, order_index) VALUES
(1, 1, 4, 180, 1), (1, 2, 4, 90, 2), (1, 3, 4, 60, 3), (1, 15, 4, 60, 4),
(2, 5, 4, 120, 1), (2, 11, 3, 90, 2), (2, 6, 4, 60, 3), (2, 14, 3, 60, 4), (2, 16, 3, 45, 5),
(3, 4, 3, 180, 1), (3, 8, 3, 120, 2), (3, 9, 3, 120, 3), (3, 13, 3, 60, 4), (3, 16, 3, 45, 5);