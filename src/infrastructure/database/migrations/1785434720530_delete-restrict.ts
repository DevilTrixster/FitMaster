import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
    // Удаление внешних ключей
    pgm.sql(`
      ALTER TABLE workout_exercises
        DROP CONSTRAINT IF EXISTS workout_exercises_workout_id_fkey;

      ALTER TABLE workout_exercises
        DROP CONSTRAINT IF EXISTS workout_exercises_exercise_id_fkey;

      ALTER TABLE user_workouts
        DROP CONSTRAINT IF EXISTS user_workouts_workout_id_fkey;
    `);

    // ДОБАВЛЕНИЕ ОГРАНИЧЕНИЙ / УСТАНОВКА НУЛЕВЫХ ВНЕШНИХ КЛЮЧЕЙ
    pgm.sql(`
      ALTER TABLE workout_exercises
        ADD CONSTRAINT workout_exercises_workout_id_fkey
        FOREIGN KEY (workout_id)
        REFERENCES workouts(id)
        ON DELETE RESTRICT;

      ALTER TABLE workout_exercises
        ADD CONSTRAINT workout_exercises_exercise_id_fkey
        FOREIGN KEY (exercise_id)
        REFERENCES exercises(id)
        ON DELETE RESTRICT;

      ALTER TABLE user_workouts
        ADD CONSTRAINT user_workouts_workout_id_fkey
        FOREIGN KEY (workout_id)
        REFERENCES workouts(id)
        ON DELETE SET NULL;
    `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    // Удаление ключей
    pgm.sql(`
      ALTER TABLE workout_exercises
        DROP CONSTRAINT IF EXISTS workout_exercises_workout_id_fkey;

      ALTER TABLE workout_exercises
        DROP CONSTRAINT IF EXISTS workout_exercises_exercise_id_fkey;

      ALTER TABLE user_workouts
        DROP CONSTRAINT IF EXISTS user_workouts_workout_id_fkey;
    `);

    // Восстановление удаленных ключей
    pgm.sql(`
      ALTER TABLE workout_exercises
        ADD CONSTRAINT workout_exercises_workout_id_fkey
        FOREIGN KEY (workout_id)
        REFERENCES workouts(id)
        ON DELETE CASCADE;

      ALTER TABLE workout_exercises
        ADD CONSTRAINT workout_exercises_exercise_id_fkey
        FOREIGN KEY (exercise_id)
        REFERENCES exercises(id)
        ON DELETE CASCADE;

      ALTER TABLE user_workouts
        ADD CONSTRAINT user_workouts_workout_id_fkey
        FOREIGN KEY (workout_id)
        REFERENCES workouts(id)
        ON DELETE CASCADE;
    `);
}