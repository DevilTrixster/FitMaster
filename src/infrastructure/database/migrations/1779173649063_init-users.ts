import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
    // Расширения
    pgm.sql(`
        CREATE EXTENSION IF NOT EXISTS pgcrypto;
        CREATE EXTENSION IF NOT EXISTS citext;
    `);


    // ENUM
    pgm.createType('gender_type', [
        'male',
        'female',
    ]);

    pgm.createType('reaction', [
        'like',
        'dislike',
        'neutral',
    ]);

    pgm.createType('workout_status_type', [
        'scheduled',
        'in_progress',
        'paused',
        'completed',
        'skipped',
        'rescheduled',
    ]);

    pgm.createType('adaptation_type', [
        'increase_weight',
        'decrease_weight',
        'increase_reps',
        'decrease_reps',
        'no_change',
        'substitution',
    ]);

    pgm.createType('metric_type', [
        'reps',
        'weight',
        'duration',
        'distance',
        'resistance',
    ]);

    pgm.createType('metric', [
        'kg',
        'metr',
        'min',
        'sec',
        'sm',
        'count',
        'min_sec',
        'km',
    ]);

    pgm.createType('equipment_type', [
        'barbell',
        'bodyweight',
        'cardio',
        'dumbbell',
        'machine',
        'cable',
        'plyometric',
    ]);

    pgm.createType('level', [
        'beginner',
        'novice',
        'intermediate',
        'advanced',
        'master',
    ]);

    pgm.createType('goal', [
        'weight_loss',
        'muscle_gain',
        'strength',
        'maintenance',
        'endurance',
        'aesthetics',
        'recomposition',
        'mobility',
        'rehabilitation',
        'sports',
        'event',
        'stress_relief',
        'energy',
        'competition',
        'posture',
        'healthy_aging',
    ]);

    pgm.createType('substitution_reason', [
        'similar_muscle_group',
        'same_equipment',
        'no_knees',
        'rehab',
        'shoulder',
        'beginner',
        'advanced',
    ]);




    // Функции

    // Проверка дней
    pgm.sql(`
        CREATE OR REPLACE FUNCTION check_days_array(arr integer[])
        RETURNS boolean
        LANGUAGE sql
        IMMUTABLE
        AS $$
        SELECT COALESCE(
            bool_and(v BETWEEN 1 AND 7),
            TRUE
        )
        FROM unnest(arr) AS t(v);
        $$;
    `);

    // Обновление колонок
    pgm.sql(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER
        LANGUAGE plpgsql
        AS $$
        BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
        END;
        $$;
    `);




    // Таблицы
    pgm.createTable('users', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },

        nickname: {
            type: 'citext',
            notNull: true,
            unique: true,
        },

        password: {
            type: 'text',
            notNull: true,
        },

        email: {
            type: 'citext',
            notNull: true,
            unique: true,
        },

        first_name: {
            type: 'varchar(50)',
            notNull: true,
        },

        last_name: {
            type: 'varchar(50)',
            notNull: true,
        },

        birth_date: {
            type: 'date',
            notNull: true,
        },

        gender: {
            type: 'gender_type',
            notNull: true,
            default: 'male',
        },

        height: {
            type: 'integer',
            notNull: true,
            check: 'height > 100 AND height < 300',
        },

        weight: {
            type: 'numeric(5,2)',
            notNull: true,
            check: 'weight > 30 AND weight < 300',
        },

        preferred_workout_time: {
            type: 'time',
            notNull: true,
            default: '17:00:00',
        },

        avatar_url: { type: 'text' },

        preferred_days: {
            type: 'integer[]',
            notNull: true,
            default: pgm.func("ARRAY[1,3,5]::integer[]"),
            check: 'check_days_array(preferred_days)',
        },

        experience_level: {
            type: 'level',
            notNull: true,
            default: 'beginner',
        },

        fitness_goal: {
            type: 'goal',
            notNull: true,
            default: 'maintenance',
        },

        created_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP'),
        },

        updated_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP'),
        },
    });

    pgm.createTable('workouts', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },

        name: {
            type: 'varchar(100)',
            notNull: true,
        },

        description: { type: 'text' },

        frequency_per_week: {
            type: 'integer',
            notNull: true,
            default: 3,
            check: 'frequency_per_week >= 1 AND frequency_per_week <= 7',
        },

        is_active: {
            type: 'boolean',
            notNull: true,
            default: true,
        },

        created_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP'),
        },

        updated_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP'),
        },
    });

    pgm.createTable('muscle_groups', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },

        name: {
            type: 'varchar(100)',
            notNull: true,
            unique: true,
        },

        parent_id: {
            type: 'uuid',
            references: 'muscle_groups(id)',
            onDelete: 'CASCADE',
        },

        created_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP'),
        },

        updated_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP'),
        },
    });

    pgm.createTable('exercises', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },

        name: {
            type: 'varchar(100)',
            notNull: true,
        },

        description: { type: 'text' },

        equipment_type: {
            type: 'equipment_type',
            notNull: true,
            default: 'bodyweight',
        },

        is_active: {
            type: 'boolean',
            notNull: true,
            default: true,
        },

        fatigue_index: {
            type: 'numeric(3,1)',
            notNull: true,
            default: 1.0,
            check: 'fatigue_index >= 0',
        },

        stimulus_index: {
            type: 'numeric(3,1)',
            notNull: true,
            default: 5.0,
            check: 'stimulus_index >= 0',
        },

        injury_risk: {
            type: 'numeric(3,1)',
            notNull: true,
            default: 1.0,
            check: 'injury_risk >= 0',
        },

        skill_requirement: {
            type: 'numeric(3,1)',
            notNull: true,
            default: 1.0,
            check: 'skill_requirement >= 0',
        },

        recovery_cost: {
            type: 'numeric(3,1)',
            notNull: true,
            default: 5.0,
            check: 'recovery_cost >= 0',
        },

        created_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP'),
        },

        updated_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP'),
        },
    });

    // exercises <-> muscle_groups (многие ко многим с приоритетом)
    pgm.createTable('exercise_muscles',{
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },

        exercise_id: {
            type: 'uuid',
            notNull: true,
            references: 'exercises(id)',
            onDelete: 'CASCADE',
        },

        muscle_group_id: {
            type: 'uuid',
            notNull: true,
            references: 'muscle_groups(id)',
            onDelete: 'CASCADE',
        },

        priority: {
            type: 'integer',
            notNull: true,
            default: 100,
            check: 'priority > 0',
        },

        created_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP'),
        },

        updated_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP'),
        }},
        {
        constraints: { unique: [['exercise_id', 'muscle_group_id']] }
    });

    // workout <-> exercises
    pgm.createTable('workout_exercises', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },

        workout_id: {
            type: 'uuid',
            notNull: true,
            references: 'workouts(id)',
            onDelete: 'CASCADE',
        },

        exercise_id: {
            type: 'uuid',
            notNull: true,
            references: 'exercises(id)',
            onDelete: 'CASCADE',
        },

        sets: {
            type: 'integer',
            notNull: true,
            check: 'sets > 0 AND sets <= 10',
        },

        rest_seconds: {
            type: 'integer',
            notNull: true,
            default: 60,
            check: 'rest_seconds >= 0',
        },

        order_index: {
            type: 'integer',
            notNull: true,
            check: 'order_index > 0',
        },

        created_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP'),
        },

        updated_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP'),
        }},
        {
        constraints: { unique: [['workout_id', 'exercise_id', 'order_index']] },
    });

    pgm.createTable('user_workouts', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },

        user_id: {
            type: 'uuid',
            notNull: true,
            references: 'users(id)',
            onDelete: 'CASCADE',
        },

        workout_id: {
            type: 'uuid',
            references: 'workouts(id)',
            onDelete: 'CASCADE',
        },

        scheduled_date: {
            type: 'date',
            notNull: true,
        },

        scheduled_time: {
            type: 'time',
            notNull: true,
            default: '17:00:00',
        },

        status: {
            type: 'workout_status_type',
            notNull: true,
            default: 'scheduled',
        },

        started_at: { type: 'timestamp with time zone' },

        paused_at: { type: 'timestamp with time zone' },

        completed_at: { type: 'timestamp with time zone' },

        last_completed_exercise_id: {
            type: 'uuid',
            references: 'exercises(id)',
            onDelete: 'SET NULL',
        },

        wellness_rating: {
            type: 'integer',
            check: 'wellness_rating >= 1 AND wellness_rating <= 5',
        },

        comments: { type: 'text' },

        rescheduled_to: { type: 'date' },

        reschedule_reason: { type: 'text' },

        planned_difficulty: {
            type: 'integer',
            notNull: true,
            default: 7,
            check: 'planned_difficulty >= 1 AND planned_difficulty <= 10',
        },

        created_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP'),
        },

        updated_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP'),
        }
    });

    pgm.createTable('exercise_sets', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },

        workout_exercise_id: {
            type: 'uuid',
            notNull: true,
            references: 'workout_exercises(id)',
            onDelete: 'CASCADE',
        },

        set_number: {
            type: 'integer',
            notNull: true,
            check: 'set_number > 0',
        },

        set_type: {
            type: 'varchar(50)',
            notNull: true,
            default: 'normal',
        },

        is_completed: {
            type: 'boolean',
            notNull: true,
            default: false,
        },

        created_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP'),
        },

        updated_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP'),
        }},

        {
        constraints: { unique: [['workout_exercise_id', 'set_number']]}
    });

    pgm.createTable('set_metrics', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },

        exercise_set_id: {
            type: 'uuid',
            notNull: true,
            references: 'exercise_sets(id)',
            onDelete: 'CASCADE',
        },

        metric_type: {
            type: 'metric_type',
            notNull: true,
        },

        value: {
            type: 'numeric(10,2)',
            notNull: true,
            check: 'value >= 0',
        },

        unit: { type: 'metric' },

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
    });

    pgm.createTable('workout_adaptations', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },

        user_id: {
            type: 'uuid',
            references: 'users(id)',
            onDelete: 'CASCADE',
        },

        user_workout_id: {
            type: 'uuid',
            references: 'user_workouts(id)',
            onDelete: 'CASCADE',
        },

        exercise_id: {
            type: 'uuid',
            references: 'exercises(id)',
            onDelete: 'CASCADE',
        },

        previous_weight: {
            type: 'numeric(6,2)',
            check: 'previous_weight IS NULL OR previous_weight >= 0',
        },

        new_weight: {
            type: 'numeric(6,2)',
            check: 'new_weight IS NULL OR new_weight >= 0',
        },

        previous_reps: {
            type: 'integer',
            check: 'previous_reps IS NULL OR previous_reps >= 0',
        },

        new_reps: {
            type: 'integer',
            check: 'new_reps IS NULL OR new_reps >= 0',
        },

        adaptation_type: {
            type: 'adaptation_type',
            notNull: true,
            default: 'no_change',
        },

        adaptation_reason: { type: 'varchar(500)' },

        created_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP'),
        },

        updated_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP'),
        }
    });

    pgm.createTable('fatigue_recovery', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },

        user_id: {
            type: 'uuid',
            references: 'users(id)',
            onDelete: 'CASCADE',
        },

        date: {
            type: 'date',
            notNull: true,
        },

        fatigue_score: {
            type: 'numeric(5,2)',
            check: 'fatigue_score IS NULL OR (fatigue_score >= 0 AND fatigue_score <= 100)',
        },

        recovery_score: {
            type: 'numeric(5,2)',
            check: 'recovery_score IS NULL OR (recovery_score >= 0 AND recovery_score <= 100)',
        },

        performance_trend: {
            type: 'numeric(5,2)',
        },

        adaptation_rate: {
            type: 'numeric(5,2)',
        },

        injury_risk: {
            type: 'numeric(5,2)',
            check: 'injury_risk IS NULL OR injury_risk >= 0',
        },

        raw_data: { type: 'jsonb' },

        created_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP'),
        },

        updated_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP'),
        }},
        
        {
        constraints: { unique: [['user_id', 'date']] }
    });

    pgm.createTable('muscle_recovery', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },

        user_id: {
            type: 'uuid',
            references: 'users(id)',
            onDelete: 'CASCADE',
        },

        muscle_group_id: {
            type: 'uuid',
            references: 'muscle_groups(id)',
            onDelete: 'CASCADE',
        },

        last_trained_date: { type: 'date' },

        recovery_percentage: {
            type: 'numeric(5,2)',
            notNull: true,
            default: 100,
            check: 'recovery_percentage >= 0 AND recovery_percentage <= 100',
        },

        created_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP'),
        },

        updated_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP'),
        }},
        
        {
        constraints: { unique: [['user_id', 'muscle_group_id']] },
    });

    pgm.createTable('exercise_likes', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },

        user_id: {
            type: 'uuid',
            notNull: true,
            references: 'users(id)',
            onDelete: 'CASCADE',
        },

        exercise_id: {
            type: 'uuid',
            notNull: true,
            references: 'exercises(id)',
            onDelete: 'CASCADE',
        },

        liked: {
            type: 'reaction',
            notNull: true,
        },

        created_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP'),
        },

        updated_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP'),
        }},
        
        {
        constraints: { unique: [['user_id', 'exercise_id']]},
    });



    // Индексы
    pgm.createIndex('workout_exercises', ['workout_id'], { name: 'idx_workout_exercises_workout_id' });
    pgm.createIndex('workout_exercises', ['exercise_id'], { name: 'idx_workout_exercises_exercise_id' });
    pgm.createIndex('exercise_muscles', ['exercise_id'], { name: 'idx_exercise_muscles_exercise_id' });
    pgm.createIndex('exercise_muscles', ['muscle_group_id'], { name: 'idx_exercise_muscles_muscle_group_id'});
    pgm.createIndex('user_workouts', ['user_id', 'scheduled_date'], { name: 'idx_user_workouts_user_date'});
    pgm.createIndex('user_workouts', ['status'], { name: 'idx_user_workouts_status'});
    pgm.createIndex('user_workouts', ['completed_at'], { name: 'idx_user_workouts_completed_at', where: 'completed_at IS NOT NULL'});
    pgm.createIndex('user_workouts', ['workout_id'], {name: 'idx_user_workouts_workout_id'});
    pgm.createIndex('exercise_sets', ['workout_exercise_id'], { name: 'idx_exercise_sets_workout_exercise_id'});
    pgm.createIndex('set_metrics', ['exercise_set_id'], { name: 'idx_set_metrics_exercise_set_id' });
    pgm.createIndex('workout_adaptations', ['user_id', 'exercise_id', 'created_at'], { name: 'idx_workout_adaptations_user_exercise_created'});
    pgm.createIndex('workout_adaptations', ['user_workout_id'], { name: 'idx_workout_adaptations_user_workout_id'});
    pgm.createIndex('fatigue_recovery',  ['user_id', 'date'], {name: 'idx_fatigue_recovery_user_date'});
    pgm.createIndex('muscle_recovery', ['user_id'], {name: 'idx_muscle_recovery_user_id'});
    pgm.createIndex('muscle_recovery', ['muscle_group_id'], { name: 'idx_muscle_recovery_muscle_group_id' });

    // Триггер обновления
    pgm.sql(`
        CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

        CREATE TRIGGER update_workouts_updated_at
        BEFORE UPDATE ON workouts
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

        CREATE TRIGGER update_muscle_groups_updated_at
        BEFORE UPDATE ON muscle_groups
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

        CREATE TRIGGER update_exercises_updated_at
        BEFORE UPDATE ON exercises
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

        CREATE TRIGGER update_exercise_muscles_updated_at
        BEFORE UPDATE ON exercise_muscles
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

        CREATE TRIGGER update_workout_exercises_updated_at
        BEFORE UPDATE ON workout_exercises
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

        CREATE TRIGGER update_user_workouts_updated_at
        BEFORE UPDATE ON user_workouts
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

        CREATE TRIGGER update_exercise_sets_updated_at
        BEFORE UPDATE ON exercise_sets
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

        CREATE TRIGGER update_set_metrics_updated_at
        BEFORE UPDATE ON set_metrics
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

        CREATE TRIGGER update_workout_adaptations_updated_at
        BEFORE UPDATE ON workout_adaptations
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

        CREATE TRIGGER update_fatigue_recovery_updated_at
        BEFORE UPDATE ON fatigue_recovery
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

        CREATE TRIGGER update_muscle_recovery_updated_at
        BEFORE UPDATE ON muscle_recovery
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

        CREATE TRIGGER update_exercise_likes_updated_at
        BEFORE UPDATE ON exercise_likes
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

}

export async function down(pgm: MigrationBuilder): Promise<void> {
    // Удаление триггеров
    pgm.sql(`
        DROP TRIGGER IF EXISTS update_exercise_likes_updated_at
        ON exercise_likes;

        DROP TRIGGER IF EXISTS update_muscle_recovery_updated_at
        ON muscle_recovery;

        DROP TRIGGER IF EXISTS update_fatigue_recovery_updated_at
        ON fatigue_recovery;

        DROP TRIGGER IF EXISTS update_workout_adaptations_updated_at
        ON workout_adaptations;

        DROP TRIGGER IF EXISTS update_set_metrics_updated_at
        ON set_metrics;

        DROP TRIGGER IF EXISTS update_exercise_sets_updated_at
        ON exercise_sets;

        DROP TRIGGER IF EXISTS update_user_workouts_updated_at
        ON user_workouts;

        DROP TRIGGER IF EXISTS update_workout_exercises_updated_at
        ON workout_exercises;

        DROP TRIGGER IF EXISTS update_exercise_muscles_updated_at
        ON exercise_muscles;

        DROP TRIGGER IF EXISTS update_exercises_updated_at
        ON exercises;

        DROP TRIGGER IF EXISTS update_muscle_groups_updated_at
        ON muscle_groups;

        DROP TRIGGER IF EXISTS update_workouts_updated_at
        ON workouts;

        DROP TRIGGER IF EXISTS update_users_updated_at
        ON users;
    `);

    // Удаление индексов
    pgm.dropIndex('muscle_recovery','idx_muscle_recovery_muscle_group_id',{ ifExists: true });
    pgm.dropIndex('muscle_recovery','idx_muscle_recovery_user_id',{ ifExists: true });
    pgm.dropIndex('fatigue_recovery','idx_fatigue_recovery_user_date',{ ifExists: true });
    pgm.dropIndex('workout_adaptations','idx_workout_adaptations_user_workout_id',{ ifExists: true });
    pgm.dropIndex('workout_adaptations','idx_workout_adaptations_user_exercise_created',{ ifExists: true });
    pgm.dropIndex('set_metrics','idx_set_metrics_exercise_set_id',{ ifExists: true });
    pgm.dropIndex('exercise_sets','idx_exercise_sets_workout_exercise_id',{ ifExists: true });
    pgm.dropIndex('user_workouts','idx_user_workouts_workout_id',{ ifExists: true });
    pgm.dropIndex('user_workouts','idx_user_workouts_completed_at',{ ifExists: true });
    pgm.dropIndex('user_workouts','idx_user_workouts_status',{ ifExists: true });
    pgm.dropIndex('user_workouts','idx_user_workouts_user_date',{ ifExists: true });
    pgm.dropIndex('workout_exercises','idx_workout_exercises_exercise_id',{ ifExists: true });
    pgm.dropIndex('workout_exercises','idx_workout_exercises_workout_id',{ ifExists: true });
    pgm.dropIndex('exercise_muscles','idx_exercise_muscles_muscle_group_id',{ ifExists: true });
    pgm.dropIndex('exercise_muscles','idx_exercise_muscles_exercise_id',{ ifExists: true });


    // Удаление таблиц
    pgm.dropTable('exercise_likes', { ifExists: true, cascade: true });
    pgm.dropTable('muscle_recovery', { ifExists: true, cascade: true });
    pgm.dropTable('fatigue_recovery', { ifExists: true, cascade: true});
    pgm.dropTable('workout_adaptations', { ifExists: true,cascade: true });
    pgm.dropTable('set_metrics', { ifExists: true, cascade: true });
    pgm.dropTable('exercise_sets', { ifExists: true, cascade: true });
    pgm.dropTable('user_workouts', { ifExists: true, cascade: true });
    pgm.dropTable('workout_exercises', { ifExists: true, cascade: true });
    pgm.dropTable('exercise_muscles', { ifExists: true, cascade: true });
    pgm.dropTable('exercises', { ifExists: true, cascade: true });
    pgm.dropTable('muscle_groups', { ifExists: true, cascade: true });
    pgm.dropTable('workouts', { ifExists: true, cascade: true });
    pgm.dropTable('users', { ifExists: true, cascade: true });

    // Удаление функций
    pgm.sql(`
        DROP FUNCTION IF EXISTS check_days_array(integer[]);
        DROP FUNCTION IF EXISTS update_updated_at_column();
    `);

    // Удаление ENUM
    pgm.dropType('substitution_reason', { ifExists: true, cascade: true });
    pgm.dropType('goal', { ifExists: true, cascade: true });
    pgm.dropType('level', { ifExists: true, cascade: true });
    pgm.dropType('equipment_type', { ifExists: true, cascade: true });
    pgm.dropType('metric', { ifExists: true, cascade: true });
    pgm.dropType('metric_type', { ifExists: true, cascade: true });
    pgm.dropType('adaptation_type', { ifExists: true, cascade: true });
    pgm.dropType('workout_status_type', { ifExists: true, cascade: true });
    pgm.dropType('reaction', { ifExists: true, cascade: true });
    pgm.dropType('gender_type', { ifExists: true, cascade: true });
}