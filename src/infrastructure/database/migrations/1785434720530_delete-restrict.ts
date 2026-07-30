import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
   // Удаляем старые ограничения, если они существуют
  pgm.sql(`
    ALTER TABLE workout_exercises DROP CONSTRAINT IF EXISTS workout_exercises_workout_id_fkey;
    ALTER TABLE workout_exercises DROP CONSTRAINT IF EXISTS workout_exercises_exercise_id_fkey;
    ALTER TABLE user_workouts DROP CONSTRAINT IF EXISTS user_workouts_workout_id_fkey;
  `);

  // Добавляем новые с нужными правилами
  pgm.sql(`
    ALTER TABLE workout_exercises
      ADD CONSTRAINT workout_exercises_workout_id_fkey
      FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE RESTRICT;

    ALTER TABLE workout_exercises
      ADD CONSTRAINT workout_exercises_exercise_id_fkey
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT;

    ALTER TABLE user_workouts
      ADD CONSTRAINT user_workouts_workout_id_fkey
      FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE SET NULL;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Откат: возвращаем каскадное удаление
  pgm.sql(`
    ALTER TABLE workout_exercises DROP CONSTRAINT IF EXISTS workout_exercises_workout_id_fkey;
    ALTER TABLE workout_exercises DROP CONSTRAINT IF EXISTS workout_exercises_exercise_id_fkey;
    ALTER TABLE user_workouts DROP CONSTRAINT IF EXISTS user_workouts_workout_id_fkey;

    ALTER TABLE workout_exercises
      ADD CONSTRAINT workout_exercises_workout_id_fkey
      FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE;

    ALTER TABLE workout_exercises
      ADD CONSTRAINT workout_exercises_exercise_id_fkey
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE;

    ALTER TABLE user_workouts
      ADD CONSTRAINT user_workouts_workout_id_fkey
      FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE;
  `);
}