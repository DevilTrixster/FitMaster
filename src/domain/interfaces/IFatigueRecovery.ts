export interface FatigueRecoveryMetrics {
  fatigueScore: number;    // 0-100, чем выше, тем больше утомление
  recoveryScore: number;   // 0-100, способность тренироваться
  muscleRecovery: Record<string, number>; // muscleGroup -> recovery%
  injuryRisk: number;      // 0-100
  performanceTrend: number; // % изменения
}

export interface IFatigueRecoveryService {
  calculateMetrics(userId: number): Promise<FatigueRecoveryMetrics>;
}