import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
    // ENUM
    pgm.createType("adaptation_snapshot_reason", [
        "WORKOUT_COMPLETED",
        "DAILY_ANALYSIS",
        "PROFILE_UPDATED",
        "GOAL_CHANGED",
        "PROGRAM_CHANGED",
        "MANUAL_RECALCULATION",
        "SYSTEM_RECALCULATION"]
    );

    pgm.createType("adaptation_value_type", [
        "NUMERIC",
        "BOOLEAN",
        "INTEGER",
        "PERCENT",
        "ENUM"]
    );

    pgm.createType("adaptation_category_type", [
        "RECOVERY",
        "MENTAL",
        "TRAINING",
        "PHYSIOLOGY",
        "LIFESTYLE",
        "CARDIO"]
    );

    pgm.createType("data_source_type", [
        "USER_INPUT",
        "CALCULATED",
        "WATCH",
        "APPLE_HEALTH",
        "GOOGLE_FIT",
        "ESTIMATED"]
    );

    pgm.createType("adaptation_metric_category", [
        "RECOVERY",
        "READINESS",
        "FATIGUE",
        "INJURY",
        "PROGRESSION",
        "PERFORMANCE"]
    );

    pgm.createType("direction_type", [
        "POSITIVE",
        "NEGATIVE",
        "INVERSE"]
    );





    // Таблицы
    pgm.createTable("user_adaptation_profiles", {
        // Индефикация 
        id: {
            type: "serial",
            primaryKey: true
        },

        user_id: {
            type: "integer",
            notNull: true,
            // unique: true,
            references: "users(id)",
            onDelete: "CASCADE"
        },

        // Обучение
        profile_confidence: {
            type: "numeric(5,4)",
            notNull: true,
            default: 0,
            check: 'profile_confidence >= 0 AND profile_confidence <= 1'
        },

        learning_iterations: {
            type: "integer",
            notNull: true,
            default: 0,
            check: 'learning_iterations >= 0'
        },

        prediction_accuracy: {
            type: "numeric(5,4)",
            notNull: true,
            default: 0.5000,
            check: 'prediction_accuracy >= 0 AND prediction_accuracy <= 1'
        },

        // Восстановление
        recovery_speed: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
            check: 'recovery_speed >= 0 AND recovery_speed <= 2'
        },

        fatigue_resistance: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
            check: 'fatigue_resistance >= 0 AND fatigue_resistance <= 2'
        },

        recovery_efficiency: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
            check: 'recovery_efficiency >= 0 AND recovery_efficiency <= 2'
        },

        recovery_debt_resistance: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
            check: 'recovery_debt_resistance >= 0 AND recovery_debt_resistance <= 2'
        },

        // Реакция на обучение
        volume_tolerance: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
            check: 'volume_tolerance >= 0 AND volume_tolerance <= 2'
        },

        intensity_tolerance: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
            check: 'intensity_tolerance >= 0 AND intensity_tolerance <= 2'
        },

        frequency_tolerance: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
            check: 'frequency_tolerance >= 0 AND frequency_tolerance <= 2'
        },

        progression_rate: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
            check: 'progression_rate >= 0 AND progression_rate <= 2'
        },

        plateau_sensitivity: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
            check: 'plateau_sensitivity >= 0 AND plateau_sensitivity <= 2'
        },

        // Физиологические особенности
        strength_response: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
            check: 'strength_response >= 0 AND strength_response <= 2'
        },

        hypertrophy_response: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
            check: 'hypertrophy_response >= 0 AND hypertrophy_response <= 2'
        },

        endurance_response: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
            check: 'endurance_response >= 0 AND endurance_response <= 2'
        },

        injury_sensitivity: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
            check: 'injury_sensitivity >= 0 AND injury_sensitivity <= 2'
        },

        adaptability: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
            check: 'adaptability >= 0 AND adaptability <= 2'
        },

        consistency_score: {
            type: "numeric(5,4)",
            notNull: true,
            default: 0.5000,
            check: 'consistency_score >= 0 AND consistency_score <= 1'
        },

        // Метадата
        needs_recalculation: {
            type: "boolean",
            notNull: true,
            default: false,
        },

        parameter_confidence: {
            type: "jsonb",
            notNull: true,
            default: "{}",
            check: "jsonb_typeof(parameter_confidence) = 'object'"
        },

        last_learning_at: {
            type: "timestamp with time zone",
        },

        created_at: {
            type: "timestamp with time zone",
            notNull: true,
            default: pgm.func("CURRENT_TIMESTAMP"),
        },

        updated_at: {
            type: "timestamp with time zone",
            notNull: true,
            default: pgm.func("CURRENT_TIMESTAMP"),
        }
    });

    pgm.createTable("user_adaptation_snapshots", {

        id: {
            type: "serial",
            primaryKey: true
        },

        user_id: {
            type: "integer",
            notNull: true,
            references: "users(id)",
            onDelete: "CASCADE",
        },

        workout_id: {
            type: "integer",
            references: "workouts(id)",
            onDelete: "SET NULL",
        },
        
        parent_snapshot_id: {
            type: "integer",
            references: "user_adaptation_snapshots(id)",
            onDelete: "SET NULL",
        },

        snapshot_reason: {
            type: "adaptation_snapshot_reason",
            notNull: true,
        },

        created_at: {
            type: "timestamp with time zone",
            notNull: true,
            default: pgm.func("CURRENT_TIMESTAMP"),
        }
    });

    pgm.createTable("adaptation_factors", {

        id: {
            type: "serial",
            primaryKey: true
        },

        code: {
            type: "varchar(50)",
            notNull: true,
            unique: true,
        },

        name: {
            type: "varchar(100)",
            notNull: true,
        },

        description: {
            type: "text",
        },

        category: {
            type: "adaptation_category_type",
            notNull: true,
        },

        value_type: {
            type: "adaptation_value_type",
            notNull: true,
        },

        min_value: {
            type: "numeric(6,3)",
            notNull: true
        },

        max_value: {
            type: "numeric(6,3)",
            notNull: true
        },

        default_value: {
            type: "numeric(6,3)",
            notNull: true,
        },

        weight: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1,
            check: "weight >= 0 AND weight <= 2"
        },

        is_required: {
            type: "boolean",
            notNull: true,
            default: true,
        },

        is_active: {
            type: "boolean",
            notNull: true,
            default: true,
        },

        created_at: {
            type: "timestamp with time zone",
            notNull: true,
            default: pgm.func("CURRENT_TIMESTAMP"),
        }
    }, {
        constraints: { check: `
            min_value < max_value
            AND default_value >= min_value
            AND default_value <= max_value
        `}
    });

    pgm.createTable("adaptation_metrics", {
        id: {
            type: "serial",
            primaryKey: true
        },

        code: {
            type: "varchar(50)",
            notNull: true,
            // unique: true,
        },

        name: {
            type: "varchar(100)",
            notNull: true,
        },

        description: {
            type: "text",
        },

        category: {
            type: "adaptation_metric_category",
            notNull: true,
        },

        unit: {
            type: "varchar(20)",
        },

        created_at: {
            type: "timestamp with time zone",
            notNull: true,
            default: pgm.func("CURRENT_TIMESTAMP"),
        }
    });

    pgm.createTable("adaptation_factor_targets", {
        id: {
            type: "serial",
            primaryKey: true
        },
        factor_id: {
            type: "integer",
            notNull: true,
            references: "adaptation_factors(id)",
            onDelete: "CASCADE",
        },
        metric_id: {
            type: "integer",
            notNull: true,
            references: "adaptation_metrics(id)",
            onDelete: "CASCADE",
        },
        weight: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
            check: "weight >= 0 AND weight <= 2"
        },
        learning_enabled: {
            type: "boolean",
            notNull: true,
            default: true
        },
        direction: {
            type: "direction_type",
            notNull: true,
            default: "POSITIVE",
        },
        created_at: {
            type: "timestamp with time zone",
            notNull: true,
            default: pgm.func("CURRENT_TIMESTAMP"),
        },
    }, {
    constraints: { unique: ["factor_id", "metric_id"]}
    });

    pgm.createTable("user_snapshot_factor_values", {
        id: {
            type: "serial",
            primaryKey: true
        },

        snapshot_id: {
            type: "integer",
            notNull: true,
            references: "user_adaptation_snapshots(id)",
            onDelete: "CASCADE",
        },

        factor_id: {
            type: "integer",
            notNull: true,
            references: "adaptation_factors(id)",
            onDelete: "CASCADE",
        },

        value: {
            type: "numeric(6,3)",
            notNull: true,
            check: 'value >= 0'
        },

        confidence: {
            type: "numeric(5,4)",
            default: 0.5000,
            check: 'confidence >= 0 AND confidence <= 1'
        },

        source: {
            type: "data_source_type",
            notNull: true,
            default: "ESTIMATED",
        },

        created_at: {
            type: "timestamp with time zone",
            notNull: true,
            default: pgm.func("CURRENT_TIMESTAMP"),
        },
    });

    pgm.createTable("user_snapshot_metric_values", {
        id: {
            type: "serial",
            primaryKey: true
        },

        snapshot_id: {
            type: "integer",
            notNull: true,
            references: "user_adaptation_snapshots(id)",
            onDelete: "CASCADE",
        },

        metric_id: {
            type: "integer",
            notNull: true,
            references: "adaptation_metrics(id)",
            onDelete: "CASCADE",
        },

        value: {
            type: "numeric(6,3)",
            notNull: true,
            check: 'value >= 0'
        },

        confidence: {
            type: "numeric(5,4)",
            default: 0.5000,
            check: 'confidence >= 0 AND confidence <= 1'
        },

        source: {
            type: "data_source_type",
            notNull: true,
            default: "ESTIMATED",
        },

        created_at: {
            type: "timestamp with time zone",
            notNull: true,
            default: pgm.func("CURRENT_TIMESTAMP"),
        },
    });

    pgm.createTable("user_muscle_states", {

        id: {
            type: "serial",
            primaryKey: true
        },

        user_id: {
            type: "integer",
            notNull: true,
            references: "users(id)",
            onDelete: "CASCADE",
        },

        muscle_group_id: {
            type: "integer",
            notNull: true,
            references: "muscle_groups(id)",
            onDelete: "CASCADE",
        },

        last_snapshot_id: {
            type: "integer",
            references: "user_adaptation_snapshots(id)",
            onDelete: "SET NULL",
        },

        recovery_score: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
            check: 'recovery_score >= 0 AND recovery_score <= 1'
        },

        fatigue_score: {
            type: "numeric(5,4)",
            notNull: true,
            default: 0.0000,
            check: 'fatigue_score >= 0 AND fatigue_score <= 1'
        },

        damage_score: {
            type: "numeric(5,4)",
            notNull: true,
            default: 0.0000,
            check: 'damage_score >= 0 AND damage_score <= 1'
        },

        readiness_score: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
            check: 'readiness_score >= 0 AND readiness_score <= 1'
        },

        adaptation_score: {
            type: "numeric(5,4)",
            notNull: true,
            default: 0.5000,
            check: 'adaptation_score >= 0 AND adaptation_score <= 1'
        },

        accumulated_load: {
            type: "numeric(8,3)",
            notNull: true,
            default: 0,
            check: "accumulated_load >= 0"
        },

        recovery_velocity: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
            check: "recovery_velocity >= 0"
        },

        fatigue_velocity: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
            check: "fatigue_velocity >= 0"
        },

        effective_training_stimulus: {
            type: "numeric(6,3)",
            notNull: true,
            default: 0,
            check: "effective_training_stimulus >= 0"
        },

        last_trained_at: {
            type: "timestamp with time zone",
        },

        estimated_full_recovery_at: {
            type: "timestamp with time zone",
        },

        created_at: {
            type: "timestamp with time zone",
            notNull: true,
            default: pgm.func("CURRENT_TIMESTAMP"),
        },

        updated_at: {
            type: "timestamp with time zone",
            notNull: true,
            default: pgm.func("CURRENT_TIMESTAMP"),
        }

    });

    pgm.createTable("user_adaptation_risk_states", {

        id: {
            type: "serial",
            primaryKey: true
        },

        user_id: {
            type: "integer",
            notNull: true,
            references: "users(id)",
            onDelete: "CASCADE",
        },

        snapshot_id: {
            type: "integer",
            references: "user_adaptation_snapshots(id)",
            onDelete: "SET NULL",
        },


        // Общая готовность организма к тренировке.
        readiness_score: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
            check: 'readiness_score >= 0 AND readiness_score <= 1',
        },

        /*
        * Общая нагрузка / усталость организма.
        * 0 = отсутствует
        * 1 = экстремальная
        */
        fatigue_score: {
            type: "numeric(5,4)",
            notNull: true,
            default: 0.0000,
            check: 'fatigue_score >= 0 AND fatigue_score <= 1',
        },

        /*
        * Накопленный recovery debt.
        *
        * 0 = долга нет
        * 1 = критический долг восстановления
        */
        recovery_debt_score: {
            type: "numeric(5,4)",
            notNull: true,
            default: 0.0000,
            check: 'recovery_debt_score >= 0 AND recovery_debt_score <= 1',
        },

        /*
        * Риск перетренированности.
        *
        * 0 = минимальный
        * 1 = критический
        */
        overtraining_risk: {
            type: "numeric(5,4)",
            notNull: true,
            default: 0.0000,
            check: 'overtraining_risk >= 0 AND overtraining_risk <= 1',
        },

        /*
        * Риск травмы.
        *
        * 0 = минимальный
        * 1 = критический
        */
        injury_risk: {
            type: "numeric(5,4)",
            notNull: true,
            default: 0.0000,
            check: 'injury_risk >= 0 AND injury_risk <= 1',
        },

        /*
        * Риск чрезмерной нагрузки.
        *
        * Отличается от overtraining_risk:
        *
        * overload = текущая нагрузка
        * overtraining = накопленный системный эффект
        */
        overload_risk: {
            type: "numeric(5,4)",
            notNull: true,
            default: 0.0000,
            check: 'overload_risk >= 0 AND overload_risk <= 1',
        },

        /*
        * Системное восстановление организма.
        *
        * Учитывает не отдельную мышцу,
        * а организм в целом.
        */
        systemic_recovery_score: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
            check: 'systemic_recovery_score >= 0 AND systemic_recovery_score <= 1',
        },

        /*
        * Психологическая / ментальная готовность.
        */
        mental_readiness_score: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
            check: 'mental_readiness_score >= 0 AND mental_readiness_score <= 1',
        },

        /*
        * Уверенность алгоритма в полученных показателях.
        */
        confidence: {
            type: "numeric(5,4)",
            notNull: true,
            default: 0.5000,
            check: 'confidence >= 0 AND confidence <= 1',
        },

        /*
        * Можно ли пользователю рекомендовать
        * полноценную тренировку.
        */
        training_allowed: {
            type: "boolean",
            notNull: true,
            default: true,
            check: `
                training_allowed = true
                OR estimated_training_ready_at IS NOT NULL
            `,
        },

        /*
        * Когда алгоритм считает,
        * что полноценная тренировка снова станет допустимой.
        */
        estimated_training_ready_at: {
            type: "timestamp with time zone",
        },

        calculated_at: {
            type: "timestamp with time zone",
            notNull: true,
            default: pgm.func("CURRENT_TIMESTAMP"),
        },

        created_at: {
            type: "timestamp with time zone",
            notNull: true,
            default: pgm.func("CURRENT_TIMESTAMP"),
        },

        updated_at: {
            type: "timestamp with time zone",
            notNull: true,
            default: pgm.func("CURRENT_TIMESTAMP"),
        },
    });





    // Индексы
    pgm.createIndex("user_adaptation_profiles", "user_id", { unique: true, name: "idx_user_adaptation_profiles_user_id"});
    pgm.createIndex("user_adaptation_profiles", "needs_recalculation", { name: "idx_user_adaptation_profiles_needs_recalculation" });
    pgm.createIndex("user_adaptation_profiles", "last_learning_at", { name: "idx_user_adaptation_profiles_last_learning_at" });
    pgm.createIndex("user_adaptation_snapshots", "user_id", { name: "idx_user_adaptation_snapshots_user_id" });
    pgm.createIndex("user_adaptation_snapshots", "workout_id", { name: "idx_user_adaptation_snapshots_workout_id" });
    pgm.createIndex("user_adaptation_snapshots", ["user_id", "created_at"], { name: "idx_user_adaptation_snapshots_history" });
    pgm.createIndex('user_adaptation_snapshots', 'parent_snapshot_id', { name: 'idx_user_adaptation_snapshots_parent' });
    pgm.createIndex("adaptation_factors", "category");
    pgm.createIndex("adaptation_factors", "is_active");
    pgm.createIndex("adaptation_metrics", "code", { unique: true, name: "idx_adaptation_metrics_code_unique" });
    pgm.createIndex("adaptation_factor_targets", "factor_id");
    pgm.createIndex("adaptation_factor_targets", "metric_id");
    pgm.createIndex("user_snapshot_factor_values", "snapshot_id");
    pgm.createIndex("user_snapshot_factor_values", "factor_id");
    pgm.createIndex("user_snapshot_metric_values", "snapshot_id");
    pgm.createIndex("user_snapshot_metric_values", "metric_id");
    pgm.createIndex("user_snapshot_factor_values", "source", { name: "idx_factor_values_source" });
    pgm.createIndex("user_snapshot_metric_values", "source", { name: "idx_metric_values_source" });
    pgm.createIndex("user_muscle_states", ["user_id", "muscle_group_id"], { unique: true, name: "idx_user_muscle_states_unique" });
    pgm.createIndex("user_muscle_states", "last_snapshot_id", { name: "idx_user_muscle_states_snapshot" });
    pgm.createIndex("user_muscle_states", "readiness_score", { name: "idx_user_muscle_states_readiness" });
    pgm.createIndex("user_muscle_states", "estimated_full_recovery_at", { name: "idx_user_muscle_states_recovery_time" });
    pgm.createIndex("user_adaptation_risk_states", "user_id", { unique: true, name: "idx_user_adaptation_risk_states_user_id" });
    pgm.createIndex("user_adaptation_risk_states", "snapshot_id", { name: "idx_user_adaptation_risk_states_snapshot" });
    pgm.createIndex("user_adaptation_risk_states", "training_allowed", { name: "idx_user_adaptation_risk_states_training_allowed" });
    pgm.createIndex("user_adaptation_risk_states", "estimated_training_ready_at", { name: "idx_user_adaptation_risk_states_ready_at" });


    // Наполнение таблицы adaptation_factors
    pgm.sql(`
        INSERT INTO adaptation_factors
        (code,name,category,value_type,min_value,max_value,default_value,weight)

        VALUES
        ('SLEEP','Sleep','RECOVERY','NUMERIC',0,1,0.75,1.30),
        ('NUTRITION','Nutrition','RECOVERY','NUMERIC',0,1,0.80,1.25),
        ('HYDRATION','Hydration','RECOVERY','NUMERIC',0,1,0.80,1.05),
        ('STRESS','Stress','RECOVERY','NUMERIC',0,1,0.50,1.15),
        ('DOMS','Muscle soreness','RECOVERY','NUMERIC',0,1,0.40,1.15),
        ('MOTIVATION','Motivation','MENTAL','NUMERIC',0,1,0.70,0.50),
        ('CONSISTENCY','Consistency','TRAINING','NUMERIC',0,1,0.50,1.40),
        ('GOAL_ALIGNMENT','Goal alignment','TRAINING','NUMERIC',0,1,1.00,1.00);
    `);

}

export async function down(pgm: MigrationBuilder): Promise<void> {
     // Удаляние индексы
    pgm.dropIndex('user_adaptation_profiles', 'user_id', { name: 'idx_user_adaptation_profiles_user_id' });
    pgm.dropIndex('user_adaptation_profiles', 'needs_recalculation', { name: 'idx_user_adaptation_profiles_needs_recalculation' });
    pgm.dropIndex('user_adaptation_profiles', 'last_learning_at', { name: 'idx_user_adaptation_profiles_last_learning_at' });
    pgm.dropIndex('user_adaptation_snapshots', 'user_id', { name: 'idx_user_adaptation_snapshots_user_id' });
    pgm.dropIndex('user_adaptation_snapshots', 'workout_id', { name: 'idx_user_adaptation_snapshots_workout_id' });
    pgm.dropIndex('user_adaptation_snapshots', ['user_id', 'created_at'], { name: 'idx_user_adaptation_snapshots_history' });
    pgm.dropIndex('user_adaptation_snapshots', 'parent_snapshot_id', { name: 'idx_user_adaptation_snapshots_parent' });    
    pgm.dropIndex('adaptation_factors', 'category');
    pgm.dropIndex('adaptation_factors', 'is_active');
    pgm.dropIndex('adaptation_metrics', 'code', { name: "idx_adaptation_metrics_code_unique" });
    pgm.dropIndex('adaptation_factor_targets', 'factor_id');
    pgm.dropIndex('adaptation_factor_targets', 'metric_id');
    pgm.dropIndex('user_snapshot_factor_values', 'snapshot_id');
    pgm.dropIndex('user_snapshot_factor_values', 'factor_id');
    pgm.dropIndex('user_snapshot_factor_values', 'source', { name: 'idx_factor_values_source' });
    pgm.dropIndex('user_snapshot_metric_values', 'snapshot_id');
    pgm.dropIndex('user_snapshot_metric_values', 'metric_id');
    pgm.dropIndex('user_snapshot_metric_values', 'source', { name: 'idx_metric_values_source' });
    pgm.dropIndex("user_muscle_states", ["user_id", "muscle_group_id"], { name: "idx_user_muscle_states_unique" });
    pgm.dropIndex("user_muscle_states", "last_snapshot_id", { name: "idx_user_muscle_states_snapshot" });
    pgm.dropIndex("user_muscle_states", "readiness_score", { name: "idx_user_muscle_states_readiness" });
    pgm.dropIndex("user_muscle_states", "estimated_full_recovery_at", { name: "idx_user_muscle_states_recovery_time" });
    pgm.dropIndex("user_adaptation_risk_states", "user_id", { name: "idx_user_adaptation_risk_states_user_id" });
    pgm.dropIndex("user_adaptation_risk_states", "snapshot_id", { name: "idx_user_adaptation_risk_states_snapshot" });
    pgm.dropIndex("user_adaptation_risk_states", "training_allowed", { name: "idx_user_adaptation_risk_states_training_allowed" });
    pgm.dropIndex("user_adaptation_risk_states", "estimated_training_ready_at", { name: "idx_user_adaptation_risk_states_ready_at" });
    

    // Удаляние таблиц
    pgm.dropTable('user_adaptation_risk_states');
    pgm.dropTable('user_muscle_states');
    pgm.dropTable('user_snapshot_metric_values');
    pgm.dropTable('user_snapshot_factor_values');
    pgm.dropTable('adaptation_factor_targets');
    pgm.dropTable('adaptation_metrics');
    pgm.dropTable('adaptation_factors');
    pgm.dropTable('user_adaptation_snapshots');
    pgm.dropTable('user_adaptation_profiles');

    // Удаляние все созданные ENUM
    pgm.dropType('direction_type');
    pgm.dropType('adaptation_metric_category');
    pgm.dropType('data_source_type');
    pgm.dropType('adaptation_category_type');
    pgm.dropType('adaptation_value_type');
    pgm.dropType('adaptation_snapshot_reason');
}
