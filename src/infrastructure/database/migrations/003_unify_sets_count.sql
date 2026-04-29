-- Устанавливаем 4 подхода для всех упражнений в тренировках
UPDATE workout_exercises
SET sets = 4
WHERE sets != 4;