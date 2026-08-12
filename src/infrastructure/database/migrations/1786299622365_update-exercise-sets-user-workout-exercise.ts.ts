import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
    /*
     * Старые exercise_sets нельзя безопасно перенести,
     * потому что они не знают конкретный user_workout.
     *
     * Поэтому миграция намеренно останавливается,
     * если таблица уже содержит данные.
     */
    pgm.sql(`
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM exercise_sets
                LIMIT 1
            ) THEN
                RAISE EXCEPTION
                    'Cannot migrate exercise_sets: table contains existing data. Data migration is required before changing the relationship.';
            END IF;
        END
        $$;
    `);

    //Удаляем старый индекс.
    pgm.dropIndex(
        'exercise_sets',
        'idx_exercise_sets_workout_exercise_id',
        {
            ifExists: true,
        }
    );

    // Удаляем старый FK:
    pgm.sql(`
        ALTER TABLE exercise_sets
        DROP CONSTRAINT IF EXISTS exercise_sets_workout_exercise_id_fkey;
    `);


    // Удаляем старую связь.
    pgm.dropColumn(
        'exercise_sets',
        'workout_exercise_id'
    );


    // Создаём новую связь:
    pgm.addColumn('exercise_sets', {
        user_workout_exercise_id: {
            type: "integer",
            notNull: true,
            references: 'user_workout_exercises(id)',
            onDelete: 'CASCADE',
        },
    });


    // Меняем UNIQUE:
    pgm.dropConstraint(
        'exercise_sets',
        'exercise_sets_workout_exercise_id_set_number_key',
        {
            ifExists: true,
        }
    );

    pgm.addConstraint(
        'exercise_sets',
        'uq_exercise_sets_user_workout_exercise_set_number',
        {
            unique: ['user_workout_exercise_id', 'set_number'],
        }
    );


    // Новый индекс
    pgm.createIndex('exercise_sets',['user_workout_exercise_id'], { name: 'idx_exercise_sets_user_workout_exercise_id' });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.sql(`
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM exercise_sets
                LIMIT 1
            ) THEN
                RAISE EXCEPTION
                    'Cannot rollback exercise_sets relationship while table contains data.';
            END IF;
        END
        $$;
    `);

    pgm.dropIndex('exercise_sets','idx_exercise_sets_user_workout_exercise_id', { ifExists: true });

    // Удаляем новый UNIQUE.
    pgm.dropConstraint('exercise_sets','uq_exercise_sets_user_workout_exercise_set_number', { ifExists: true });

    // Удаляем новый FK.
    pgm.sql(`ALTER TABLE exercise_sets
        DROP CONSTRAINT IF EXISTS exercise_sets_user_workout_exercise_id_fkey;
    `);


    // Удаляем новую колонку.
    pgm.dropColumn('exercise_sets', 'user_workout_exercise_id');

    // Возвращаем старую колонку.
    pgm.addColumn('exercise_sets', {
        workout_exercise_id: {
            type: "integer",
            notNull: true,
            references: 'workout_exercises(id)',
            onDelete: 'CASCADE',
        },
    });

    // Возвращаем старое UNIQUE.
    pgm.addConstraint('exercise_sets','uq_exercise_sets_workout_exercise_set_number', { unique: ['workout_exercise_id', 'set_number']});


    // Возвращаем старый индекс.
    pgm.createIndex('exercise_sets',['workout_exercise_id'], { name: 'idx_exercise_sets_workout_exercise_id' });
}