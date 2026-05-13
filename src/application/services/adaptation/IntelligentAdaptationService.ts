import { IWorkoutRepository } from '../../../domain/interfaces/IWorkoutRepository';
import { IUserRepository } from '../../../domain/interfaces/IUserRepository';
import { WorkoutAdaptation, AdaptationType } from '../../../domain/entities/Workout';
import { SetAnalysisData } from '../../dto/SetAnalysisData';
import { FatigueRecoveryService } from './FatigueRecoveryService';
import { PlateauDetectionService } from './PlateauDetectionService';

export class IntelligentAdaptationService {
  constructor(
    private workoutRepo: IWorkoutRepository,
    private userRepo: IUserRepository,
    private fatigueService: FatigueRecoveryService,
    private plateauService: PlateauDetectionService
  ) {}

  async adaptExercise(
    userId: number,
    completedWorkoutId: number,
    exerciseId: number,
    muscleGroup: string,
    results: SetAnalysisData[],
    wellnessRating: number
  ): Promise<WorkoutAdaptation | null> {
    const metrics = await this.fatigueService.calculateMetrics(userId);
    const muscleRecovery = metrics.muscleRecovery[muscleGroup] ?? 80;

    // Принудительная разгрузка при очень низком восстановлении мышцы
    if (muscleRecovery < 50) {
      return new WorkoutAdaptation({
        userId,
        exerciseId,
        previousWeight: 0,
        newWeight: 0,
        previousReps: 0,
        newReps: 0,
        adaptationType: AdaptationType.DecreaseWeight,
        reason: `Низкое восстановление мышцы (${muscleRecovery}%). Принудительная разгрузка.`,
      });
    }

    const completedResults = results.filter(r => r.completed && !r.skipped);
    if (completedResults.length === 0) return null;

    const targetReps = results[0]?.targetReps ?? 10;
    const targetWeight = results[0]?.targetWeight ?? 0;
    const avgReps = completedResults.reduce((s, r) => s + (r.reps ?? 0), 0) / completedResults.length;
    const trend = metrics.performanceTrend;

    let newWeight = targetWeight;
    let newReps = targetReps;
    let adaptationType = AdaptationType.NoChange;
    let reason = '';

    if (avgReps >= targetReps && trend > 0) {
      newWeight = Math.round(newWeight * 1.025);
      adaptationType = AdaptationType.IncreaseWeight;
      reason = 'Стабильный прогресс. Повышение веса.';
    } else if (avgReps >= targetReps && trend <= 0) {
      adaptationType = AdaptationType.NoChange;
      reason = 'Повторения выполнены, но отрицательный тренд. Вес не меняется.';
    } else if (avgReps < targetReps * 0.8) {
      if (muscleRecovery < 70) {
        newWeight = Math.round(newWeight * 0.9);
        adaptationType = AdaptationType.DecreaseWeight;
        reason = 'Низкие повторения и низкое восстановление. Снижение веса.';
      } else {
        adaptationType = AdaptationType.NoChange;
        reason = 'Низкие повторения, но восстановление нормальное. Сохранение веса.';
      }
    } else {
      adaptationType = AdaptationType.NoChange;
      reason = 'Умеренная производительность. Без изменений.';
    }

    // Проверка плато
    const isPlateau = await this.plateauService.isPlateau(userId, exerciseId);
    if (isPlateau) {
      reason += ' Обнаружено плато. Рекомендуется смена упражнения.';
    }

    if (adaptationType === AdaptationType.NoChange && reason === '') return null;

    const adaptation = new WorkoutAdaptation({
      userId,
      exerciseId,
      previousWeight: targetWeight,
      newWeight,
      previousReps: targetReps,
      newReps,
      adaptationType,
      reason,
    });

    await this.workoutRepo.saveAdaptation(adaptation);
    return adaptation;
  }
}