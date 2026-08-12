import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {

    // Таблицы
    pgm.createTable('exercise_substitutions', {
      id: {
          type: 'serial',
          primaryKey: true
      },

      exercise_id: {
          type: 'integer',
          notNull: true,
          references: 'exercises(id)',
          onDelete: 'CASCADE'
      },

      substitute_exercise_id: {
          type: 'integer',
          notNull: true,
          references: 'exercises(id)',
          onDelete: 'CASCADE'
      },

      priority: {
          type: 'integer',
          notNull: true,
          default: 1,
          check: 'priority BETWEEN 1 AND 100'
      },

      reason: {
          type: 'substitution_reason',
          notNull: true,
          default: 'similar_muscle_group'
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
          unique: [['exercise_id', 'substitute_exercise_id']],
          check: 'exercise_id <> substitute_exercise_id',
      }
    });

    pgm.createTable('deload_periods', {
        id: {
            type: 'serial',
            primaryKey: true
        },

        user_id: {
            type: 'integer',
            notNull: true,
            references: 'users(id)',
            onDelete: 'CASCADE'
        },

        start_date: {
            type: 'date',
            notNull: true
        },

        end_date: {
            type: 'date',
            check: 'end_date IS NULL OR end_date >= start_date'
        },

        intensity_factor: {
            type: 'numeric(3,2)',
            notNull: true,
            default: 0.6,
            check: 'intensity_factor > 0 AND intensity_factor <= 2'
        },

        reason: { type: 'varchar(255)' },

        created_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP')
        },

        updated_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP')
        }
    });

    pgm.createTable('exercise_recommendations', {
        id: {
            type: 'serial',
            primaryKey: true
        },

        user_id: {
            type: 'integer',
            notNull: true,
            references: 'users(id)',
            onDelete: 'CASCADE'
        },

        exercise_id: {
            type: 'integer',
            notNull: true,
            references: 'exercises(id)',
            onDelete: 'CASCADE'
        },

        suggested_exercise_id: {
            type: 'integer',
            notNull: true,
            references: 'exercises(id)',
            onDelete: 'CASCADE'
        },

        reason: {
            type: 'varchar(255)',
            notNull: true
        },

        is_active: {
            type: 'boolean',
            notNull: true,
            default: true
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
        },

        applied_at: { type: 'timestamp with time zone' },
    }, {
        constraints: { check: 'exercise_id <> suggested_exercise_id' },
    });


    // Индексы
    pgm.createIndex('deload_periods', ['user_id'], { name: 'idx_deload_periods_user' });
    pgm.createIndex('exercise_recommendations', ['user_id', 'is_active', 'created_at'],{ name: 'idx_exercise_recommendations_user_active' });
    pgm.createIndex('exercise_substitutions', ['exercise_id'], { name: 'idx_exercise_substitutions_exercise' });
    pgm.createIndex('exercise_substitutions', ['substitute_exercise_id'], { name: 'idx_exercise_substitutions_substitute' });


    // Триггер обновления
    pgm.sql(`
        CREATE TRIGGER update_exercise_substitutions_updated_at
        BEFORE UPDATE ON exercise_substitutions
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

        CREATE TRIGGER update_deload_periods_updated_at
        BEFORE UPDATE ON deload_periods
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

        CREATE TRIGGER update_exercise_recommendations_updated_at
        BEFORE UPDATE ON exercise_recommendations
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
}


export async function down(pgm: MigrationBuilder): Promise<void> {
    // Удаление индексов
    pgm.dropIndex('exercise_recommendations','idx_exercise_recommendations_user_active', { ifExists: true });
    pgm.dropIndex('deload_periods','idx_deload_periods_user', { ifExists: true });
    pgm.dropIndex('exercise_substitutions','idx_exercise_substitutions_substitute',  { ifExists: true });
    pgm.dropIndex('exercise_substitutions', 'idx_exercise_substitutions_exercise', { ifExists: true });

    // Триггер
    pgm.sql(`
        DROP TRIGGER IF EXISTS update_exercise_recommendations_updated_at
        ON exercise_recommendations;

        DROP TRIGGER IF EXISTS update_deload_periods_updated_at
        ON deload_periods;

        DROP TRIGGER IF EXISTS update_exercise_substitutions_updated_at
        ON exercise_substitutions;
    `);

    // Таблицы
    pgm.dropTable('exercise_recommendations', {
            ifExists: true,
            cascade: true,
    });

    pgm.dropTable('deload_periods', {
            ifExists: true,
            cascade: true,
    });

    pgm.dropTable('exercise_substitutions', {
            ifExists: true,
            cascade: true,
    });
}