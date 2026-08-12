import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
    // Таблица
    pgm.createTable('user_workout_exercises', {
        id: {
            type: "serial",
            primaryKey: true
        },

        user_workout_id: {
            type: "integer",
            notNull: true,
            references: 'user_workouts(id)',
            onDelete: 'CASCADE'
        },

        workout_exercise_id: {
            type: "integer",
            notNull: true,
            references: 'workout_exercises(id)',
            onDelete: 'RESTRICT'
        },

        target_sets: {
            type: 'integer',
            notNull: true,
            check: 'target_sets > 0 AND target_sets <= 10'
        },

        target_reps: {
            type: 'integer',
            check: 'target_reps IS NULL OR target_reps > 0'
        },

        target_weight: {
            type: 'numeric(6,2)',
            check: 'target_weight IS NULL OR target_weight >= 0'
        },

        order_index: {
            type: 'integer',
            notNull: true,
            check: 'order_index > 0'
        },

        created_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP')
        },

        updated_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP')
        }}, 
    
        {
        constraints: {
            unique: [['user_workout_id', 'workout_exercise_id'], ['user_workout_id', 'order_index']]},
    });

    // Индексы
    pgm.createIndex('user_workout_exercises',['user_workout_id'],{ name: 'idx_user_workout_exercises_user_workout' });
    pgm.createIndex('user_workout_exercises',['workout_exercise_id'],{ name: 'idx_user_workout_exercises_workout_exercise' });

    // Триггер
    pgm.sql(`
        CREATE TRIGGER trg_user_workout_exercises_updated_at
        BEFORE UPDATE ON user_workout_exercises
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    // Удаление триггера
    pgm.sql(`
        DROP TRIGGER IF EXISTS trg_user_workout_exercises_updated_at
        ON user_workout_exercises;
    `);

    // Удаление таблицы
    pgm.dropTable('user_workout_exercises', { cascade: false });
}