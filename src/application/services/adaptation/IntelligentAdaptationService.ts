import { IWorkoutRepository } from '../../../domain/interfaces/IWorkoutRepository';
import { IUserRepository } from '../../../domain/interfaces/IUserRepository';
import { WorkoutAdaptation, AdaptationType } from '../../../domain/entities/Workout';
import { SetAnalysisData } from '../../dto/SetAnalysisData';
import { FatigueRecoveryService } from './FatigueRecoveryService';
import { PlateauDetectionService } from './PlateauDetectionService';
import { ExperienceLevel, FitnessGoal } from '../../../domain/entities/User';

export class IntelligentAdaptationService {
  // Коэффициенты веса в зависимости от уровня
  private weightMultipliers: Record<ExperienceLevel, number> = {
    [ExperienceLevel.Beginner]: 0.4,
    [ExperienceLevel.Novice]: 0.7,
    [ExperienceLevel.Intermediate]: 1.0,
    [ExperienceLevel.Advanced]: 1.2,
    [ExperienceLevel.Master]: 1.5,
  };

  // Базовые повторения для упражнений с собственным весом
  private bodyweightRepsBase: Record<string, Record<ExperienceLevel, number>> = {
    'Отжимания': { beginner: 5, novice: 10, intermediate: 15, advanced: 20, master: 30 },
    'Подтягивания': { beginner: 1, novice: 3, intermediate: 6, advanced: 10, master: 15 },
    'Приседания (собственный вес)': { beginner: 10, novice: 15, intermediate: 20, advanced: 30, master: 40 },
  };

  constructor(
    private workoutRepo: IWorkoutRepository,
    private userRepo: IUserRepository,
    private fatigueService: FatigueRecoveryService,
    private plateauService: PlateauDetectionService
  ) {}

  /**
   * Инициализация начальных целей (вес/повторения) для всех упражнений пользователя
   * на основе его уровня опыта.
   * Удаляет старые глобальные адаптации и создаёт новые.
   */
  async initializeTargets(userId: number): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new Error('User not found');

    // 1. Удаляем все глобальные адаптации (без привязки к тренировке)
    await this.workoutRepo.deleteGlobalAdaptations(userId);

    // 2. Получаем все упражнения из сплит-программ
    const splitPrograms = await this.workoutRepo.getSplitPrograms();
    const exerciseIds = new Set<number>();
    for (const program of splitPrograms) {
      for (const we of program.exercises) {
        if (we.exercise.id) exerciseIds.add(we.exercise.id);
      }
    }

    // 3. Для каждого упражнения вычисляем начальные вес/повторения
    for (const exerciseId of exerciseIds) {
      const templates = await this.workoutRepo.getExerciseMetricTemplates(exerciseId);
      const weightTemplate = templates.find(t => t.metricType === 'weight');
      const repsTemplate = templates.find(t => t.metricType === 'reps');

      let newWeight = weightTemplate?.defaultValue ?? 0;
      let newReps = repsTemplate?.defaultValue ?? 10;

      // Корректировка веса по уровню
      const multiplier = this.weightMultipliers[user.experienceLevel] || 1.0;
      if (weightTemplate && weightTemplate.defaultValue) {
        newWeight = Math.round(weightTemplate.defaultValue * multiplier);
        if (weightTemplate.unit === 'kg' && newWeight < 5) newWeight = 5;
        if (exerciseId === 5 && newWeight < 20) newWeight = 20; // жим лёжа – минимум 20 кг
      }

      // Корректировка повторений для упражнений с собственным весом
      const exercise = await this.workoutRepo.getExerciseById(exerciseId);
      if (exercise && exercise.equipmentType === 'bodyweight' && repsTemplate) {
        const rule = this.bodyweightRepsBase[exercise.name];
        if (rule) {
          newReps = rule[user.experienceLevel] || rule.novice;
        } else {
          newReps = Math.max(1, Math.round(newReps * multiplier));
        }
      } else if (repsTemplate) {
        newReps = repsTemplate.defaultValue ?? 10;
      }

      const adaptation = new WorkoutAdaptation({
        userId,
        exerciseId,
        previousWeight: 0,
        newWeight,
        previousReps: 0,
        newReps,
        adaptationType: AdaptationType.NoChange,
        reason: `Initial targets based on level ${user.experienceLevel}`,
      });
      await this.workoutRepo.saveAdaptation(adaptation);
    }
  }

  /**
   * Переинициализация целей (например, после изменения уровня или цели).
   */
  async reinitializeTargets(userId: number): Promise<void> {
    await this.initializeTargets(userId);
  }

  /**
   * Адаптация нагрузки после выполнения упражнения.
   * @param goal - цель тренировок (сила, гипертрофия, выносливость и т.д.)
   */
  async adaptExercise(
    userId: number,
    completedWorkoutId: number,
    exerciseId: number,
    muscleGroup: string,
    results: SetAnalysisData[],
    wellnessRating: number,
    goal: FitnessGoal = FitnessGoal.Maintenance   // добавлен параметр цели
  ): Promise<WorkoutAdaptation | null> {
    const metrics = await this.fatigueService.calculateMetrics(userId);
    const muscleRecovery = metrics.muscleRecovery[muscleGroup] ?? 80;

    // Принудительная разгрузка при очень низком восстановлении
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

    // Логика адаптации с учётом цели
    switch (goal) {
      case FitnessGoal.Strength:
        if (avgReps >= targetReps * 0.9 && trend > -5) {
          newWeight = Math.round(targetWeight * 1.05);
          adaptationType = AdaptationType.IncreaseWeight;
          reason = 'Цель: сила. Увеличение веса.';
        } else if (avgReps < targetReps * 0.7) {
          newWeight = Math.round(targetWeight * 0.95);
          adaptationType = AdaptationType.DecreaseWeight;
          reason = 'Цель: сила. Снижение веса из-за недовыполнения.';
        }
        break;

      case FitnessGoal.MuscleGain:
      case FitnessGoal.Aesthetics:
        if (avgReps >= targetReps && targetReps < 12) {
          newReps = Math.min(targetReps + 2, 12);
          adaptationType = AdaptationType.IncreaseReps;
          reason = 'Цель: гипертрофия. Увеличение повторений.';
        } else if (avgReps >= 12 && trend > 0) {
          newWeight = Math.round(targetWeight * 1.025);
          newReps = targetReps;
          adaptationType = AdaptationType.IncreaseWeight;
          reason = 'Цель: гипертрофия. Увеличение веса.';
        } else if (avgReps < targetReps * 0.8) {
          newWeight = Math.round(targetWeight * 0.9);
          adaptationType = AdaptationType.DecreaseWeight;
          reason = 'Цель: гипертрофия. Снижение веса.';
        }
        break;

      case FitnessGoal.Endurance:
        if (avgReps >= targetReps && targetReps < 20) {
          newReps = Math.min(targetReps + 3, 20);
          adaptationType = AdaptationType.IncreaseReps;
          reason = 'Цель: выносливость. Увеличение повторений.';
        } else if (avgReps < targetReps * 0.7 && targetWeight > 0) {
          newWeight = Math.round(targetWeight * 0.9);
          adaptationType = AdaptationType.DecreaseWeight;
          reason = 'Цель: выносливость. Снижение веса.';
        }
        break;

      default:
        // Базовая логика (без учёта цели)
        if (avgReps >= targetReps && trend > 0) {
          newWeight = Math.round(targetWeight * 1.025);
          adaptationType = AdaptationType.IncreaseWeight;
          reason = 'Стабильный прогресс. Повышение веса.';
        } else if (avgReps < targetReps * 0.8 && muscleRecovery < 70) {
          newWeight = Math.round(targetWeight * 0.9);
          adaptationType = AdaptationType.DecreaseWeight;
          reason = 'Низкие повторения и восстановление. Снижение веса.';
        } else {
          reason = 'Без изменений.';
        }
        break;
    }

    // Проверка плато
    const isPlateau = await this.plateauService.isPlateau(userId, exerciseId);
    if (isPlateau) {
      reason += ' Обнаружено плато. Рекомендуется смена упражнения.';
    }

    if (adaptationType === AdaptationType.NoChange && reason === 'Без изменений.') return null;

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