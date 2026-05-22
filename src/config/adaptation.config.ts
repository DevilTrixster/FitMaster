export interface AdaptationConfig {
  // Коэффициенты изменения веса/повторений
  weightIncreaseStrength: number;      // 1.05
  weightDecreaseStrength: number;      // 0.95
  weightIncreaseHypertrophy: number;   // 1.025
  weightDecreaseHypertrophy: number;   // 0.9
  repsIncreaseHypertrophy: number;     // +2
  maxRepsHypertrophy: number;          // 12
  repsIncreaseEndurance: number;       // +3
  maxRepsEndurance: number;            // 20
  thresholdStrengthSuccess: number;    // 0.9 (avgReps >= targetReps * 0.9)
  thresholdStrengthFailure: number;    // 0.7
  thresholdHypertrophyFailure: number; // 0.8
  thresholdEnduranceFailure: number;   // 0.7

  // Пороги восстановления и утомления
  acuteWindowDays: number;             // 7
  chronicWindowDays: number;           // 28
  fatigueAcwrWeight: number;           // 50
  fatigueLowWellnessWeight: number;    // 5
  recoveryDaysFactor: number;          // 15
  injuryRiskFatigueWeight: number;     // 0.7
  injuryRiskRecoveryWeight: number;    // 0.3
  muscleRecoveryDaysFactor: number;    // 20
  forcedDeloadMuscleRecoveryThreshold: number; // 50
  autoDeloadFatigueThreshold: number;  // 70
  autoDeloadRecoveryThreshold: number; // 30

  // Множители веса по уровню опыта
  weightMultipliers: {
    beginner: number;
    novice: number;
    intermediate: number;
    advanced: number;
    master: number;
  };

  // Базовые повторения для упражнений с собственным весом
  bodyweightRepsBase: Record<string, Record<string, number>>;

  // Параметры пагинации и таймауты
  defaultUpcomingWorkoutsLimit: number; // 5
  defaultWorkoutHistoryLimit: number;   // 10
  defaultAdaptationsLimit: number;      // 20
  defaultPreferredWorkoutTime: string;  // '17:00'
}

const config: AdaptationConfig = {
  weightIncreaseStrength: parseFloat(process.env.WEIGHT_INCREASE_STRENGTH || '1.05'),
  weightDecreaseStrength: parseFloat(process.env.WEIGHT_DECREASE_STRENGTH || '0.95'),
  weightIncreaseHypertrophy: parseFloat(process.env.WEIGHT_INCREASE_HYPERTROPHY || '1.025'),
  weightDecreaseHypertrophy: parseFloat(process.env.WEIGHT_DECREASE_HYPERTROPHY || '0.9'),
  repsIncreaseHypertrophy: parseInt(process.env.REPS_INCREASE_HYPERTROPHY || '2', 10),
  maxRepsHypertrophy: parseInt(process.env.MAX_REPS_HYPERTROPHY || '12', 10),
  repsIncreaseEndurance: parseInt(process.env.REPS_INCREASE_ENDURANCE || '3', 10),
  maxRepsEndurance: parseInt(process.env.MAX_REPS_ENDURANCE || '20', 10),
  thresholdStrengthSuccess: parseFloat(process.env.THRESHOLD_STRENGTH_SUCCESS || '0.9'),
  thresholdStrengthFailure: parseFloat(process.env.THRESHOLD_STRENGTH_FAILURE || '0.7'),
  thresholdHypertrophyFailure: parseFloat(process.env.THRESHOLD_HYPERTROPHY_FAILURE || '0.8'),
  thresholdEnduranceFailure: parseFloat(process.env.THRESHOLD_ENDURANCE_FAILURE || '0.7'),
  acuteWindowDays: parseInt(process.env.ACUTE_WINDOW_DAYS || '7', 10),
  chronicWindowDays: parseInt(process.env.CHRONIC_WINDOW_DAYS || '28', 10),
  fatigueAcwrWeight: parseFloat(process.env.FATIGUE_ACWR_WEIGHT || '50'),
  fatigueLowWellnessWeight: parseFloat(process.env.FATIGUE_LOW_WELLNESS_WEIGHT || '5'),
  recoveryDaysFactor: parseFloat(process.env.RECOVERY_DAYS_FACTOR || '15'),
  injuryRiskFatigueWeight: parseFloat(process.env.INJURY_RISK_FATIGUE_WEIGHT || '0.7'),
  injuryRiskRecoveryWeight: parseFloat(process.env.INJURY_RISK_RECOVERY_WEIGHT || '0.3'),
  muscleRecoveryDaysFactor: parseFloat(process.env.MUSCLE_RECOVERY_DAYS_FACTOR || '20'),
  forcedDeloadMuscleRecoveryThreshold: parseInt(process.env.FORCED_DELOAD_MUSCLE_RECOVERY_THRESHOLD || '50', 10),
  autoDeloadFatigueThreshold: parseInt(process.env.AUTO_DELOAD_FATIGUE_THRESHOLD || '70', 10),
  autoDeloadRecoveryThreshold: parseInt(process.env.AUTO_DELOAD_RECOVERY_THRESHOLD || '30', 10),
  weightMultipliers: {
    beginner: parseFloat(process.env.WEIGHT_MULTIPLIER_BEGINNER || '0.4'),
    novice: parseFloat(process.env.WEIGHT_MULTIPLIER_NOVICE || '0.7'),
    intermediate: parseFloat(process.env.WEIGHT_MULTIPLIER_INTERMEDIATE || '1.0'),
    advanced: parseFloat(process.env.WEIGHT_MULTIPLIER_ADVANCED || '1.2'),
    master: parseFloat(process.env.WEIGHT_MULTIPLIER_MASTER || '1.5'),
  },
  bodyweightRepsBase: {
    'Отжимания': {
      beginner: parseInt(process.env.BW_REPS_PUSHUPS_BEGINNER || '5', 10),
      novice: parseInt(process.env.BW_REPS_PUSHUPS_NOVICE || '10', 10),
      intermediate: parseInt(process.env.BW_REPS_PUSHUPS_INTERMEDIATE || '15', 10),
      advanced: parseInt(process.env.BW_REPS_PUSHUPS_ADVANCED || '20', 10),
      master: parseInt(process.env.BW_REPS_PUSHUPS_MASTER || '30', 10),
    },
    'Подтягивания': {
      beginner: parseInt(process.env.BW_REPS_PULLUPS_BEGINNER || '1', 10),
      novice: parseInt(process.env.BW_REPS_PULLUPS_NOVICE || '3', 10),
      intermediate: parseInt(process.env.BW_REPS_PULLUPS_INTERMEDIATE || '6', 10),
      advanced: parseInt(process.env.BW_REPS_PULLUPS_ADVANCED || '10', 10),
      master: parseInt(process.env.BW_REPS_PULLUPS_MASTER || '15', 10),
    },
    'Приседания (собственный вес)': {
      beginner: parseInt(process.env.BW_REPS_SQUATS_BEGINNER || '10', 10),
      novice: parseInt(process.env.BW_REPS_SQUATS_NOVICE || '15', 10),
      intermediate: parseInt(process.env.BW_REPS_SQUATS_INTERMEDIATE || '20', 10),
      advanced: parseInt(process.env.BW_REPS_SQUATS_ADVANCED || '30', 10),
      master: parseInt(process.env.BW_REPS_SQUATS_MASTER || '40', 10),
    },
  },
  defaultUpcomingWorkoutsLimit: parseInt(process.env.DEFAULT_UPCOMING_LIMIT || '5', 10),
  defaultWorkoutHistoryLimit: parseInt(process.env.DEFAULT_HISTORY_LIMIT || '10', 10),
  defaultAdaptationsLimit: parseInt(process.env.DEFAULT_ADAPTATIONS_LIMIT || '20', 10),
  defaultPreferredWorkoutTime: process.env.DEFAULT_PREFERRED_TIME || '17:00',
};

export default config;