import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
    // Таблицы
    pgm.createTable('user_profiles', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },

    user_id: {
      type: 'uuid',
      notNull: true,
      unique: true,
      references: 'users(id)',
      onDelete: 'CASCADE'
    },

    first_name: {
      type: 'varchar(50)',
      notNull: true
    },

    last_name: {
      type: 'varchar(50)',
      notNull: true
    },

    birth_date: {
      type: 'date',
      notNull: true,
      check: 'birth_date <= CURRENT_DATE'
    },

    gender: {
      type: 'gender_type',
      notNull: true,
      default: 'male'
    },

    height: {
      type: 'integer',
      notNull: true,
      check: 'height > 100 AND height < 250'
    },

    weight: {
      type: 'numeric(5,2)',
      notNull: true,
      check: 'weight > 30 AND weight < 300'
    },

    avatar_url: { type: 'text' },

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

    pgm.createTable('user_settings', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },

    user_id: {
      type: 'uuid',
      notNull: true,
      unique: true,
      references: 'users(id)',
      onDelete: 'CASCADE'
    },

    preferred_workout_time: {
      type: 'time',
      notNull: true,
      default: '17:00:00'
    },

    preferred_days: {
      type: 'integer[]',
      notNull: true,
      default: pgm.func("'{}'::integer[]"),
      check: 'check_days_array(preferred_days)'
    },

    settings_json: {
      type: 'jsonb',
      notNull: true,
      default: pgm.func("'{}'::jsonb")
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
    });

    pgm.createTable('user_preferences', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },

    user_id: {
      type: 'uuid',
      notNull: true,
      unique: true,
      references: 'users(id)',
      onDelete: 'CASCADE'
    },

    experience_level: {
      type: 'level',
      notNull: true,
      default: 'novice'
    },

    fitness_goal: {
      type: 'goal',
      notNull: true,
      default: 'maintenance'
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
    });

    // Передача данных от пользователя
    pgm.sql(`
    INSERT INTO user_profiles (
      user_id,
      first_name,
      last_name,
      birth_date,
      gender,
      height,
      weight,
      avatar_url
    )
    SELECT
      id,
      first_name,
      last_name,
      birth_date,
      gender,
      height,
      weight,
      avatar_url
    FROM users;
    `);

    pgm.sql(`
    INSERT INTO user_settings (
      user_id,
      preferred_workout_time,
      preferred_days
    )
    SELECT
      id,
      preferred_workout_time,
      preferred_days
    FROM users;
    `);

    pgm.sql(`
    INSERT INTO user_preferences (
      user_id,
      experience_level,
      fitness_goal
    )
    SELECT
      id,
      experience_level,
      fitness_goal
    FROM users;
    `);

    // Уладение колонок из user
    pgm.dropColumn('users', 'first_name');
    pgm.dropColumn('users', 'last_name');
    pgm.dropColumn('users', 'birth_date');
    pgm.dropColumn('users', 'gender');
    pgm.dropColumn('users', 'height');
    pgm.dropColumn('users', 'weight');
    pgm.dropColumn('users', 'avatar_url');
    pgm.dropColumn('users', 'preferred_workout_time');
    pgm.dropColumn('users', 'preferred_days');
    pgm.dropColumn('users', 'experience_level');
    pgm.dropColumn('users', 'fitness_goal');


    // Индексы
    pgm.createIndex('user_profiles',['user_id'],{ name: 'idx_user_profiles_user_id' });
    pgm.createIndex('user_settings',['user_id'],{ name: 'idx_user_settings_user_id'});
    pgm.createIndex('user_preferences',['user_id'],{ name: 'idx_user_preferences_user_id' });


    // Триггер
    pgm.sql(`
      CREATE TRIGGER update_user_profiles_updated_at
        BEFORE UPDATE ON user_profiles
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_user_settings_updated_at
        BEFORE UPDATE ON user_settings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_user_preferences_updated_at
        BEFORE UPDATE ON user_preferences
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  //Восстановление всех колонок в user
  pgm.addColumn('users', {
    first_name: {
      type: 'varchar(50)',
      notNull: true,
      default: ''
    },

    last_name: {
      type: 'varchar(50)',
      notNull: true,
      default: ''
    },

    birth_date: {
      type: 'date',
      notNull: true,
      default: pgm.func('CURRENT_DATE')
    },

    gender: {
      type: 'gender_type',
      notNull: true,
      default: 'male'
    },

    height: {
      type: 'integer',
      notNull: true,
      default: 170
    },

    weight: {
      type: 'numeric(5,2)',
      notNull: true,
      default: 70
    },

    avatar_url: { type: 'text' },

    preferred_workout_time: {
      type: 'time',
      notNull: true,
      default: '17:00:00'
    },

    preferred_days: {
      type: 'integer[]',
      notNull: true,
      default: pgm.func("'{}'::integer[]"),
      check: 'check_days_array(preferred_days)'
    },

    experience_level: {
      type: 'level',
      notNull: true,
      default: 'novice'
    },

    fitness_goal: {
      type: 'goal',
      notNull: true,
      default: 'maintenance'
    },
  });

  // Восстановление данных
  pgm.sql(`
    UPDATE users u
    SET
      first_name = p.first_name,
      last_name = p.last_name,
      birth_date = p.birth_date,
      gender = p.gender,
      height = p.height,
      weight = p.weight,
      avatar_url = p.avatar_url
    FROM user_profiles p
    WHERE p.user_id = u.id;
  `);

  pgm.sql(`
    UPDATE users u
    SET
      preferred_workout_time = s.preferred_workout_time,
      preferred_days = s.preferred_days
    FROM user_settings s
    WHERE s.user_id = u.id;
  `);

  pgm.sql(`
    UPDATE users u
    SET
      experience_level = p.experience_level,
      fitness_goal = p.fitness_goal
    FROM user_preferences p
    WHERE p.user_id = u.id;
  `);


  // Удаление индексов
  pgm.dropIndex('user_preferences','idx_user_preferences_user_id', { ifExists: true });
  pgm.dropIndex('user_settings','idx_user_settings_user_id', { ifExists: true });
  pgm.dropIndex('user_profiles','idx_user_profiles_user_id', { ifExists: true });


  // Удаление триггеров
  pgm.sql(`
    DROP TRIGGER IF EXISTS update_user_preferences_updated_at
      ON user_preferences;

    DROP TRIGGER IF EXISTS update_user_settings_updated_at
      ON user_settings;

    DROP TRIGGER IF EXISTS update_user_profiles_updated_at
      ON user_profiles;
  `);

  // Удаление таблиц
  pgm.dropTable('user_preferences', {
      ifExists: true,
      cascade: true,
  });
  pgm.dropTable('user_settings', {
      ifExists: true,
      cascade: true,
  });
  pgm.dropTable('user_profiles', {
      ifExists: true,
      cascade: true,
  });
}