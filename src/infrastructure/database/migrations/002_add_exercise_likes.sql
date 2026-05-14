CREATE TABLE IF NOT EXISTS exercise_likes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    liked BOOLEAN NOT NULL,   -- TRUE = лайк, FALSE = дизлайк
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, exercise_id)
);

CREATE INDEX idx_exercise_likes_user ON exercise_likes(user_id);
CREATE INDEX idx_exercise_likes_exercise ON exercise_likes(exercise_id);

-- Триггер для обновления updated_at
CREATE TRIGGER update_exercise_likes_updated_at
    BEFORE UPDATE ON exercise_likes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();