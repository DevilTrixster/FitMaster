export interface DailyMetrics {
  userId: number;
  date: string; // YYYY-MM-DD
  fatigueScore: number;
  recoveryScore: number;
  performanceTrend: number;
  adaptationRate: number; // можно добавить позже
  injuryRisk: number;
  rawData?: Record<string, any>;
}

export interface MuscleRecoveryRecord {
  userId: number;
  muscleGroup: string;
  lastTrainedDate: string;
  recoveryPercentage: number;
}

export interface IFatigueRepository {
  saveDailyMetrics(metrics: DailyMetrics): Promise<void>;
  updateMuscleRecovery(records: MuscleRecoveryRecord[]): Promise<void>;
  getMuscleRecovery(userId: number): Promise<MuscleRecoveryRecord[]>;
}