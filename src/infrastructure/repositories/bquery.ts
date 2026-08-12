// Запрос для Постановки лайка в ExerciseLikeRepository
export const q_SetLike = `
      INSERT INTO exercise_likes (user_id, exercise_id, liked, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, exercise_id)
      DO UPDATE SET liked = EXCLUDED.liked, updated_at = EXCLUDED.updated_at
    `;

// Запрос на Сохранение ежедневных показателей в FatigueRepository   
export const q_saveDailyMetrics = `
      INSERT INTO fatigue_recovery (user_id, date, fatigue_score, recovery_score, performance_trend, adaptation_rate, injury_risk, raw_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id, date)
      DO UPDATE SET
        fatigue_score = EXCLUDED.fatigue_score,
        recovery_score = EXCLUDED.recovery_score,
        performance_trend = EXCLUDED.performance_trend,
        adaptation_rate = EXCLUDED.adaptation_rate,
        injury_risk = EXCLUDED.injury_risk,
        raw_data = EXCLUDED.raw_data
    `;

// Запрос на Обновление мышечного восстановления в FatigueRepository
export const q_updateMuscleRecovery = `
          INSERT INTO muscle_recovery (user_id, muscle_group_id, last_trained_date, recovery_percentage)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id, muscle_group_id)
          DO UPDATE SET
            last_trained_date = EXCLUDED.last_trained_date,
            recovery_percentage = EXCLUDED.recovery_percentage
        `;
// Запрос на Получение мышечного восстановления в FatigueRepository
export const q_getMuscleRecovery = `
      SELECT mr.user_id, mg.name AS muscle_group, mr.last_trained_date, mr.recovery_percentage
      FROM muscle_recovery mr
      JOIN muscle_groups mg ON mg.id = mr.muscle_group_id
      WHERE mr.user_id = $1
    `;

// Запрос на Получение упражнения в прогрессе ProgressRepository
export const q_getExerciseProgress = `
      WITH set_data AS (
        SELECT
          uw.scheduled_date,
          es.id AS set_id,
          MAX(CASE WHEN sm.metric_type = 'reps' THEN sm.value END) AS reps,
          MAX(CASE WHEN sm.metric_type = 'weight' THEN sm.value END) AS weight
        FROM user_workouts uw
        JOIN workout_exercises we ON we.workout_id = uw.workout_id
        JOIN exercise_sets es ON es.workout_exercise_id = we.id
        JOIN set_metrics sm ON sm.exercise_set_id = es.id
        WHERE uw.user_id = $1
          AND uw.status = 'completed'
          AND we.exercise_id = $2
        GROUP BY uw.scheduled_date, es.id
      )
      SELECT
        e.name AS exercise_name,
        (SELECT mg.name FROM exercise_muscles em
         JOIN muscle_groups mg ON mg.id = em.muscle_group_id
         WHERE em.exercise_id = e.id
         ORDER BY em.priority DESC LIMIT 1) AS muscle_group,
        e.id AS exercise_id,
        sd.scheduled_date AS date,
        COALESCE(AVG(sd.weight), 0) AS avg_weight,
        COALESCE(SUM(sd.reps * sd.weight), 0) AS total_volume,
        COALESCE(MAX(sd.reps), 0) AS max_reps
      FROM set_data sd
      JOIN exercises e ON e.id = $2
      GROUP BY e.name, e.id, sd.scheduled_date
      ORDER BY sd.scheduled_date ASC
      LIMIT $3
    `;

// Запрос на Получение статуса по мышечной группе в ProgressRepository
export const q_getMuscleGroupStats = `
      WITH set_data AS (
        SELECT
          uw.id AS workout_id,
          uw.wellness_rating,
          (SELECT mg.name FROM exercise_muscles em
           JOIN muscle_groups mg ON mg.id = em.muscle_group_id
           WHERE em.exercise_id = e.id
           ORDER BY em.priority DESC LIMIT 1) AS muscle_group,
          es.id AS set_id,
          MAX(CASE WHEN sm.metric_type = 'reps' THEN sm.value END) AS reps,
          MAX(CASE WHEN sm.metric_type = 'weight' THEN sm.value END) AS weight
        FROM user_workouts uw
        JOIN workout_exercises we ON we.workout_id = uw.workout_id
        JOIN exercises e ON e.id = we.exercise_id
        JOIN exercise_sets es ON es.workout_exercise_id = we.id
        JOIN set_metrics sm ON sm.exercise_set_id = es.id
        WHERE uw.user_id = $1
          AND uw.status = 'completed'
        GROUP BY uw.id, uw.wellness_rating, e.id, es.id
      )
      SELECT
        muscle_group,
        COUNT(DISTINCT workout_id) AS total_workouts,
        COALESCE(SUM(reps * weight), 0) AS total_volume,
        COALESCE(AVG(wellness_rating), 0) AS avg_wellness_rating
      FROM set_data
      GROUP BY muscle_group
      ORDER BY total_volume DESC
    `;

// Запрос на Получение данных RPEData в ProgressRepository
export const q_getRPEData = `
      SELECT 
        uw.scheduled_date AS date,
        uw.wellness_rating AS actualRPE,
        COALESCE(uw.planned_difficulty, 7) AS plannedRPE
      FROM user_workouts uw
      WHERE uw.user_id = $1
        AND uw.status = 'completed'
        AND uw.wellness_rating IS NOT NULL
      ORDER BY uw.scheduled_date DESC
      LIMIT 30
    `;

// Запрос на Получение результатов упражнения в ProgressRepository
export const q_ProgressRepository = `
      SELECT 
        sm2.value AS weight,
        sm.value AS reps
      FROM user_workouts uw
      JOIN workout_exercises we ON we.workout_id = uw.workout_id
      JOIN exercise_sets es ON es.workout_exercise_id = we.id
      LEFT JOIN set_metrics sm ON sm.exercise_set_id = es.id AND sm.metric_type = 'reps'
      LEFT JOIN set_metrics sm2 ON sm2.exercise_set_id = es.id AND sm2.metric_type = 'weight'
      WHERE uw.user_id = $1
        AND we.exercise_id = $2
        AND uw.status = 'completed'
        AND sm.value IS NOT NULL
        AND sm2.value IS NOT NULL
      ORDER BY uw.scheduled_date ASC, es.set_number ASC
    `;

// Запрос на Получите радиолокатор мышечного баланса в ProgressRepository
export const q_getMuscleBalanceRadar = `
      WITH set_data AS (
        SELECT
          (SELECT mg.name FROM exercise_muscles em
           JOIN muscle_groups mg ON mg.id = em.muscle_group_id
           WHERE em.exercise_id = e.id
           ORDER BY em.priority DESC LIMIT 1) AS muscle_group,
          SUM(COALESCE(sm2.value, 0) * COALESCE(sm.value, 0)) AS volume
        FROM user_workouts uw
        JOIN workout_exercises we ON we.workout_id = uw.workout_id
        JOIN exercises e ON e.id = we.exercise_id
        JOIN exercise_sets es ON es.workout_exercise_id = we.id
        LEFT JOIN set_metrics sm ON sm.exercise_set_id = es.id AND sm.metric_type = 'reps'
        LEFT JOIN set_metrics sm2 ON sm2.exercise_set_id = es.id AND sm2.metric_type = 'weight'
        WHERE uw.user_id = $1
          AND uw.status = 'completed'
        GROUP BY e.id
      )
      SELECT muscle_group, SUM(volume) AS total_volume
      FROM set_data
      GROUP BY muscle_group
    `;

// Запрос по Поиску по email в UserRepository
export const q_findByEmail = `
      SELECT u.*,
             up.first_name, up.last_name, up.birth_date, up.gender,
             up.height, up.weight, up.avatar_url,
             us.preferred_workout_time, us.preferred_days,
             pref.experience_level, pref.fitness_goal
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN user_settings us ON us.user_id = u.id
      LEFT JOIN user_preferences pref ON pref.user_id = u.id
      WHERE u.email = $1
    `;

// Запрос по Поиску никнейму в UserRepository
export const q_findByNickname = `
      SELECT u.*,
             up.first_name, up.last_name, up.birth_date, up.gender,
             up.height, up.weight, up.avatar_url,
             us.preferred_workout_time, us.preferred_days,
             pref.experience_level, pref.fitness_goal
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN user_settings us ON us.user_id = u.id
      LEFT JOIN user_preferences pref ON pref.user_id = u.id
      WHERE u.nickname = $1
    `;

// Запрос по Поиску ид в UserRepository
export const q_findById = `
      SELECT u.*,
             up.first_name, up.last_name, up.birth_date, up.gender,
             up.height, up.weight, up.avatar_url,
             us.preferred_workout_time, us.preferred_days,
             pref.experience_level, pref.fitness_goal
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN user_settings us ON us.user_id = u.id
      LEFT JOIN user_preferences pref ON pref.user_id = u.id
      WHERE u.id = $1
    `;

// Запрос на Получение тренировки по ид в WorkoutReadRepository
export const q_getWorkoutById = `
      SELECT e.*,
             (SELECT mg.name FROM exercise_muscles em
              JOIN muscle_groups mg ON mg.id = em.muscle_group_id
              WHERE em.exercise_id = e.id
              ORDER BY em.priority DESC LIMIT 1) AS muscle_group,
             we.sets, we.rest_seconds, we.order_index
      FROM workout_exercises we
      JOIN exercises e ON we.exercise_id = e.id
      WHERE we.workout_id = $1
      ORDER BY we.order_index
    `;

// Запрос на Получение тренировок пользователя в WorkoutReadRepository
export const q_getUserWorkouts =  `
      SELECT uw.*, w.name as workout_name, w.description as workout_description
      FROM user_workouts uw
      JOIN workouts w ON uw.workout_id = w.id
      WHERE uw.user_id = $1
      ORDER BY uw.scheduled_date ASC, uw.scheduled_time ASC 
      LIMIT $2
    `;

// Запрос на Получение тренировки пользователя в WorkoutReadRepository
export const q_getUserWorkoutById = `
      SELECT uw.*, w.name as workout_name, w.description as workout_description
      FROM user_workouts uw
      JOIN workouts w ON uw.workout_id = w.id
      WHERE uw.id = $1
    `;

// Запрос на Получение истории тренировок в  WorkoutReadRepository
export const q_getWorkoutHistory = `
      SELECT uw.*, w.name as workout_name, w.description as workout_description
      FROM user_workouts uw
      JOIN workouts w ON uw.workout_id = w.id
      WHERE uw.user_id = $1
    `;

// Запрос на Получение истории завершенных тренировок в  WorkoutReadRepository
export const q_getCompletedWorkoutsHistory = `
      SELECT uw.*, w.name as workout_name, w.description as workout_description
      FROM user_workouts uw
      JOIN workouts w ON uw.workout_id = w.id
      WHERE uw.user_id = $1 AND uw.status = 'completed'
    `;

// Запрос на Получение активной тренировки пользователя в  WorkoutReadRepository
export const q_getUserActiveWorkout = `
      SELECT uw.*, w.name as workout_name, w.description as workout_description
      FROM user_workouts uw
      JOIN workouts w ON uw.workout_id = w.id
      WHERE uw.user_id = $1 AND uw.status = 'in_progress'
      ORDER BY uw.scheduled_date ASC
      LIMIT 1
    `;

// Запрос на Получение объёма тренировки в истории в WorkoutReadRepository
export const q_getDailyWorkoutVolumes = `
      SELECT uw.scheduled_date::text AS date,
            COALESCE(SUM(sm.value * sm2.value), 0) AS volume
      FROM user_workouts uw
      JOIN workout_exercises we ON we.workout_id = uw.workout_id
      JOIN exercise_sets es ON es.workout_exercise_id = we.id
      LEFT JOIN set_metrics sm ON sm.exercise_set_id = es.id AND sm.metric_type = 'reps'
      LEFT JOIN set_metrics sm2 ON sm2.exercise_set_id = es.id AND sm2.metric_type = 'weight'
      WHERE uw.user_id = $1
        AND uw.status = 'completed'
        AND uw.scheduled_date >= CURRENT_DATE - $2::int
      GROUP BY uw.scheduled_date
      ORDER BY uw.scheduled_date DESC
    `;

// Запрос на Получение тренировки в диапазоне в WorkoutReadRepository
export const q_getWorkoutsInRange = `
      SELECT uw.*, w.name as workout_name, w.description as workout_description
      FROM user_workouts uw
      JOIN workouts w ON uw.workout_id = w.id
      WHERE uw.user_id = $1 AND uw.scheduled_date BETWEEN $2 AND $3
      ORDER BY uw.scheduled_date ASC
    `;

//Запрос на Получение всех упражнений в ExerciseRepository
export const q_getAllExercises = `
      SELECT e.*,
             (SELECT mg.name FROM exercise_muscles em
              JOIN muscle_groups mg ON mg.id = em.muscle_group_id
              WHERE em.exercise_id = e.id
              ORDER BY em.priority DESC LIMIT 1) AS muscle_group
      FROM exercises e
      ORDER BY muscle_group, e.name
    `;

// Запрос на Получение упражнения по ид в ExerciseRepository
export const q_getExerciseById = `
      SELECT e.*,
             (SELECT mg.name FROM exercise_muscles em
              JOIN muscle_groups mg ON mg.id = em.muscle_group_id
              WHERE em.exercise_id = e.id
              ORDER BY em.priority DESC LIMIT 1) AS muscle_group
      FROM exercises e
      WHERE e.id = $1
    `;

// Запрос на Получение сета упражнений в ExerciseRepository
export const q_getExerciseSets = `
      SELECT
          es.id AS set_id,
          es.set_number,
          es.set_type,
          sm.id AS metric_id,
          sm.metric_type,
          sm.value,
          sm.unit
      FROM exercise_sets es
      LEFT JOIN set_metrics sm
          ON sm.exercise_set_id = es.id
      WHERE es.user_workout_exercise_id = $1
      ORDER BY es.set_number, sm.metric_type
    `;




export const bquery = {
  q_SetLike,
  q_saveDailyMetrics,
  q_updateMuscleRecovery,
  q_getMuscleRecovery,
  q_getExerciseProgress,
  q_getMuscleGroupStats,
  q_getRPEData,
  q_ProgressRepository,
  q_getMuscleBalanceRadar,
  q_findByEmail,
  q_findByNickname,
  q_findById,
  q_getWorkoutById,
  q_getUserWorkouts,
  q_getUserWorkoutById,
  q_getWorkoutHistory,
  q_getCompletedWorkoutsHistory,
  q_getUserActiveWorkout,
  q_getDailyWorkoutVolumes,
  q_getWorkoutsInRange,
  q_getAllExercises,
  q_getExerciseById,
  q_getExerciseSets
};