import { IFatigueRepository, MuscleRecoveryRecord } from '../../../domain/interfaces/IFatigueRepository';
import { IWorkoutRepository } from '../../../domain/interfaces/IWorkoutRepository';
import { FatigueRecoveryMetrics } from '../../../domain/interfaces/IFatigueRecovery';
import { IDeloadRepository } from '../../../domain/interfaces/IDeloadRepository';

export class FatigueRecoveryService {
  constructor(
    private workoutRepo: IWorkoutRepository,
    private fatigueRepo: IFatigueRepository,
    private deloadRepo: IDeloadRepository 
  ) {}

  async calculateMetrics(userId: number): Promise<FatigueRecoveryMetrics> {
    const now = new Date();
    const acuteWindow = 7;
    const chronicWindow = 28;

    // 1. Реальные объёмы по дням
    const dailyVolumes = await this.workoutRepo.getDailyWorkoutVolumes(userId, chronicWindow);

    // 2. ACWR (острое/хроническое соотношение)
    const acuteVolume = this.sumVolumesInWindow(dailyVolumes, acuteWindow, now);
    const chronicVolume = this.sumVolumesInWindow(dailyVolumes, chronicWindow, now);
    const acwr = chronicVolume > 0 ? acuteVolume / (chronicVolume / 4) : 1;

    // 3. Fatigue Score
    const workouts = await this.workoutRepo.getWorkoutHistory(userId, 30, 0, 'completed');
    const lowWellnessCount = workouts.filter(w => w.wellnessRating && w.wellnessRating <= 3).length;
    const fatigueScore = Math.min(100, Math.round(acwr * 50 + lowWellnessCount * 5));

    // 4. Recovery Score (защита от отрицательных значений)
    const lastWorkout = workouts[0];
    const daysSinceLast = Math.max(0, lastWorkout
      ? Math.floor((now.getTime() - new Date(lastWorkout.scheduledDate).getTime()) / (1000 * 3600 * 24))
      : 7);
    const recoveryBase = Math.min(100, daysSinceLast * 15);
    const wellnessBonus = lastWorkout?.wellnessRating ? lastWorkout.wellnessRating * 10 : 0;
    const recoveryScore = Math.max(0, Math.min(100, recoveryBase + wellnessBonus));

    // 5. Восстановление мышц из БД
    const muscleRecords = await this.fatigueRepo.getMuscleRecovery(userId);
    const muscleRecovery: Record<string, number> = {};
    for (const rec of muscleRecords) {
      const daysSinceTrained = rec.lastTrainedDate
        ? Math.max(0, Math.floor((now.getTime() - new Date(rec.lastTrainedDate).getTime()) / (1000 * 3600 * 24)))
        : 999;
      const pct = Math.min(100, daysSinceTrained * 20);
      muscleRecovery[rec.muscleGroup] = pct;
    }
    const defaultGroups = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];
    for (const g of defaultGroups) {
      if (!(g in muscleRecovery)) muscleRecovery[g] = 100;
    }

    // 6. Риск травмы
    const injuryRisk = Math.min(100, Math.round(fatigueScore * 0.7 + (100 - recoveryScore) * 0.3));

    // 7. Тренд производительности (14 дней против предыдущих 14)
    const recentVolume = this.sumVolumesInWindow(dailyVolumes, 14, now);
    const previousVolumes = this.sumVolumesInWindow(dailyVolumes, 28, now);
    const previousVolume = previousVolumes - recentVolume;
    const performanceTrend = previousVolume > 0
      ? ((recentVolume - previousVolume / 2) / (previousVolume / 2)) * 100
      : 0;

    return {
      fatigueScore,
      recoveryScore,
      muscleRecovery,
      injuryRisk,
      performanceTrend,
    };
  }

  private sumVolumesInWindow(
    dailyVolumes: Array<{ date: string; volume: number }>,
    daysWindow: number,
    referenceDate: Date
  ): number {
    const cutoff = new Date(referenceDate);
    cutoff.setDate(cutoff.getDate() - daysWindow);
    return dailyVolumes
      .filter(v => new Date(v.date) >= cutoff)
      .reduce((sum, v) => sum + v.volume, 0);
  }

  async saveDailyMetrics(userId: number): Promise<void> {
    const metrics = await this.calculateMetrics(userId);
    const today = new Date().toISOString().split('T')[0];

    await this.fatigueRepo.saveDailyMetrics({
      userId,
      date: today,
      fatigueScore: metrics.fatigueScore,
      recoveryScore: metrics.recoveryScore,
      performanceTrend: metrics.performanceTrend,
      adaptationRate: 0,
      injuryRisk: metrics.injuryRisk,
      rawData: {},
    });

    const muscleRecords: MuscleRecoveryRecord[] = Object.entries(metrics.muscleRecovery).map(
      ([group, pct]) => ({
        userId,
        muscleGroup: group,
        lastTrainedDate: today,
        recoveryPercentage: pct,
      })
    );
    await this.fatigueRepo.updateMuscleRecovery(muscleRecords);
  }

  async shouldDeload(userId: number): Promise<boolean> {
    const metrics = await this.calculateMetrics(userId);
    if (metrics.fatigueScore > 70 || metrics.recoveryScore < 30) {
      const active = await this.deloadRepo.getActiveDeload(userId);
      if (!active) return true;
    }
    return false;
  }
}