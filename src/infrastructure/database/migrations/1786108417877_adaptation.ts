import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
    // ENUM
    pgm.createType("training_split_type", [
        "FULL_BODY",
        "UPPER_LOWER",
        "PUSH_PULL_LEGS",
        "BRO_SPLIT",
        "CUSTOM"]
    );

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
            type: "uuid",
            primaryKey: true,
            default: pgm.func("gen_random_uuid()")
        },

        user_id: {
            type: "uuid",
            notNull: true,
            unique: true,
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
        },

        prediction_accuracy: {
            type: "numeric(5,4)",
            notNull: true,
            default: 0.5000,
        },

        // Восстановление
        recovery_speed: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
        },

        fatigue_resistance: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
        },

        recovery_efficiency: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
        },

        recovery_debt_resistance: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
        },

        // Реакция на обучение
        volume_tolerance: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
        },

        intensity_tolerance: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
        },

        frequency_tolerance: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
        },

        progression_rate: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
        },

        plateau_sensitivity: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
        },

        // Физиологические особенности
        strength_response: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
        },

        hypertrophy_response: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
        },

        endurance_response: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
        },

        injury_sensitivity: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
        },

        adaptability: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
        },

        consistency_score: {
            type: "numeric(5,4)",
            notNull: true,
            default: 0.5000,
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
            type: "uuid",
            primaryKey: true,
            default: pgm.func("gen_random_uuid()"),
        },

        user_id: {
            type: "uuid",
            notNull: true,
            references: "users(id)",
            onDelete: "CASCADE",
        },

        workout_id: {
            type: "uuid",
            references: "workouts(id)",
            onDelete: "SET NULL",
        },
        
        parent_snapshot_id: {
            type: "uuid",
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
            type: "uuid",
            primaryKey: true,
            default: pgm.func("gen_random_uuid()"),
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
            notNull: true,
        },

        max_value: {
            type: "numeric(6,3)",
            notNull: true,
        },

        default_value: {
            type: "numeric(6,3)",
            notNull: true,
        },

        weight: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1,
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
    });

    pgm.createTable("adaptation_metrics", {
        id: {
            type: "uuid",
            primaryKey: true,
            default: pgm.func("gen_random_uuid()"),
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
            type: "adaptation_metric_category",
        },
        unit: {
            type: "varchar(20)",
        },
        created_at: {
            type: "timestamp with time zone",
            notNull: true,
            default: pgm.func("CURRENT_TIMESTAMP"),
        },
    });

    pgm.createTable("adaptation_factor_targets", {
        id: {
            type: "uuid",
            primaryKey: true,
            default: pgm.func("gen_random_uuid()"),
        },
        factor_id: {
            type: "uuid",
            notNull: true,
            references: "adaptation_factors(id)",
            onDelete: "CASCADE",
        },
        metric_id: {
            type: "uuid",
            notNull: true,
            references: "adaptation_metrics(id)",
            onDelete: "CASCADE",
        },
        weight: {
            type: "numeric(5,4)",
            notNull: true,
            default: 1.0000,
        },
        learning_enable: {
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
    });

    pgm.createTable("user_snapshot_factor_values", {
        id: {
            type: "uuid",
            primaryKey: true,
            default: pgm.func("gen_random_uuid()"),
        },

        snapshot_id: {
            type: "uuid",
            notNull: true,
            references: "user_adaptation_snapshots(id)",
            onDelete: "CASCADE",
        },

        factor_id: {
            type: "uuid",
            notNull: true,
            references: "adaptation_factors(id)",
            onDelete: "CASCADE",
        },

        value: {
            type: "numeric(6,3)",
            notNull: true,
        },

        confidence: {
            type: "numeric(5,4)",
            default: 0.5000,
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
            type: "uuid",
            primaryKey: true,
            default: pgm.func("gen_random_uuid()"),
        },

        snapshot_id: {
            type: "uuid",
            notNull: true,
            references: "user_adaptation_snapshots(id)",
            onDelete: "CASCADE",
        },

        metric_id: {
            type: "uuid",
            notNull: true,
            references: "adaptation_metrics(id)",
            onDelete: "CASCADE",
        },

        value: {
            type: "numeric(6,3)",
            notNull: true,
        },

        confidence: {
            type: "numeric(5,4)",
            default: 0.5000,
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



    // Индексы
    pgm.createIndex("user_adaptation_profiles", "user_id", { unique: true, name: "idx_user_adaptation_profiles_user_id"});
    pgm.createIndex("user_adaptation_profiles", "needs_recalculation", { name: "idx_user_adaptation_profiles_needs_recalculation" });
    pgm.createIndex("user_adaptation_profiles", "last_learning_at", { name: "idx_user_adaptation_profiles_last_learning_at" });
    pgm.createIndex("user_adaptation_snapshots", "user_id", { name: "idx_user_adaptation_snapshots_user_id" });
    pgm.createIndex("user_adaptation_snapshots", "workout_id", { name: "idx_user_adaptation_snapshots_workout_id" });
    pgm.createIndex("user_adaptation_snapshots", ["user_id", "created_at"], { name: "idx_user_adaptation_snapshots_history" });
    pgm.createIndex('user_adaptation_snapshots', 'parent_snapshot_id', { name: 'idx_user_adaptation_snapshots_parent' });
    pgm.createIndex("adaptation_factors", "code");
    pgm.createIndex("adaptation_factors", "category");
    pgm.createIndex("adaptation_factors", "is_active");
    pgm.createIndex("adaptation_metrics", "code", { unique: true });
    pgm.createIndex("adaptation_factor_targets", "factor_id");
    pgm.createIndex("adaptation_factor_targets", "metric_id");
    pgm.createIndex("user_snapshot_factor_values", "snapshot_id");
    pgm.createIndex("user_snapshot_factor_values", "factor_id");
    pgm.createIndex("user_snapshot_metric_values", "snapshot_id");
    pgm.createIndex("user_snapshot_metric_values", "metric_id");
    pgm.createIndex("user_snapshot_factor_values", "source", { name: "idx_factor_values_source" });
    pgm.createIndex("user_snapshot_metric_values", "source", { name: "idx_metric_values_source" });



    // Ограничения для полей
    pgm.addConstraint('user_adaptation_profiles', 'chk_profile_confidence', {
        check: 'profile_confidence >= 0 AND profile_confidence <= 1'
    });

    pgm.addConstraint('user_adaptation_profiles', 'chk_prediction_accuracy', {
        check: 'prediction_accuracy >= 0 AND prediction_accuracy <= 1'
    });

    pgm.addConstraint("adaptation_factors", "chk_factor_weight", {
            check: "weight >= 0 AND weight <= 2"
    });

    pgm.addConstraint("adaptation_factors", "chk_factor_range", {
        check: "min_value < max_value"
    });

    pgm.addConstraint("adaptation_factor_targets", "uniq_factor_metric", {
        unique: ["factor_id", "metric_id"],
    });

    pgm.addConstraint('user_snapshot_factor_values', 'chk_factor_confidence', {
        check: 'confidence >= 0 AND confidence <= 1'
    });

    pgm.addConstraint('user_snapshot_metric_values', 'chk_metric_confidence', {
        check: 'confidence >= 0 AND confidence <= 1'
    });

    pgm.addConstraint('user_snapshot_factor_values', 'chk_factor_value_non_negative', {
        check: 'value >= 0'
    });

    pgm.addConstraint('user_snapshot_metric_values', 'chk_metric_value_non_negative', {
        check: 'value >= 0'
    });


    // Все числовые коэффициенты – единый диапазон [0, 2]
    const allCoefficientFields = [
        'recovery_speed',
        'fatigue_resistance',
        'recovery_efficiency',
        'recovery_debt_resistance',
        'volume_tolerance',
        'intensity_tolerance',
        'frequency_tolerance',
        'progression_rate',
        'plateau_sensitivity',
        'strength_response',
        'hypertrophy_response',
        'endurance_response',
        'injury_sensitivity',
        'adaptability',
        'consistency_score',
        //'exercise_variability'
    ];

    allCoefficientFields.forEach(field => {
        pgm.addConstraint('user_adaptation_profiles', `chk_${field}`, {
        check: `${field} >= 0 AND ${field} <= 2`
        });
    });

    // Ограничение для parameter_confidence – объект, все значения – числа от 0 до 1
    pgm.addConstraint('user_adaptation_profiles', 'chk_parameter_confidence', {
    check: `
        jsonb_typeof(parameter_confidence) = 'object'
        AND (
        SELECT bool_and(
            jsonb_typeof(value) = 'number' AND (value::numeric >= 0 AND value::numeric <= 1)
        )
        FROM jsonb_each(parameter_confidence)
        )
    `
    });

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
    pgm.dropIndex('adaptation_factors', 'code');      
    pgm.dropIndex('adaptation_factors', 'category');
    pgm.dropIndex('adaptation_factors', 'is_active');
    pgm.dropIndex('adaptation_metrics', 'code', { unique: true });
    pgm.dropIndex('adaptation_factor_targets', 'factor_id');
    pgm.dropIndex('adaptation_factor_targets', 'metric_id');
    pgm.dropIndex('user_snapshot_factor_values', 'snapshot_id');
    pgm.dropIndex('user_snapshot_factor_values', 'factor_id');
    pgm.dropIndex('user_snapshot_factor_values', 'source', { name: 'idx_factor_values_source' });
    pgm.dropIndex('user_snapshot_metric_values', 'snapshot_id');
    pgm.dropIndex('user_snapshot_metric_values', 'metric_id');
    pgm.dropIndex('user_snapshot_metric_values', 'source', { name: 'idx_metric_values_source' });

    // Удаляние все ограничения
    const allCoefficientFields = [
        'recovery_speed',
        'fatigue_resistance',
        'recovery_efficiency',
        'recovery_debt_resistance',
        'volume_tolerance',
        'intensity_tolerance',
        'frequency_tolerance',
        'progression_rate',
        'plateau_sensitivity',
        'strength_response',
        'hypertrophy_response',
        'endurance_response',
        'injury_sensitivity',
        'adaptability',
        'consistency_score',
    ];

    allCoefficientFields.forEach(field => {
        pgm.dropConstraint('user_adaptation_profiles', `chk_${field}`);
    });

    // Удаление ограничений
    pgm.dropConstraint('user_adaptation_profiles', 'chk_parameter_confidence');
    pgm.dropConstraint('user_adaptation_profiles', 'chk_profile_confidence');
    pgm.dropConstraint('user_adaptation_profiles', 'chk_prediction_accuracy');
    pgm.dropConstraint('adaptation_factors', 'chk_factor_weight');
    pgm.dropConstraint('adaptation_factors', 'chk_factor_range');
    pgm.dropConstraint('adaptation_factor_targets', 'uniq_factor_metric');
    pgm.dropConstraint('user_snapshot_factor_values', 'chk_factor_confidence');
    pgm.dropConstraint('user_snapshot_metric_values', 'chk_metric_confidence');
    pgm.dropConstraint('user_snapshot_factor_values', 'chk_factor_value_non_negative');
    pgm.dropConstraint('user_snapshot_metric_values', 'chk_metric_value_non_negative');

    // Удаляние таблиц
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
    pgm.dropType('training_split_type');
}
