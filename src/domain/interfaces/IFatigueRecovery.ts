// Интерфейс метрик переутомления
export interface FatigueRecoveryMetrics {
  fatigueScore: number;    // 0-100, чем выше, тем больше утомление
  recoveryScore: number;   // 0-100, способность тренироваться
  muscleRecovery: Record<string, number>; // muscleGroup -> recovery%
  injuryRisk: number;      // 0-100 риск травмы
  performanceTrend: number; // % изменения
}

// Сервис переутомления
export interface IFatigueRecoveryService {
  calculateMetrics(userId: number): Promise<FatigueRecoveryMetrics>;
}