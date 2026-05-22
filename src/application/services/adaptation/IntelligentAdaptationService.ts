import { IWorkoutRepository } from '../../../domain/interfaces/IWorkoutRepository';
import { IUserRepository } from '../../../domain/interfaces/IUserRepository';
import { WorkoutAdaptation, AdaptationType } from '../../../domain/entities';
import { SetAnalysisData } from '../../dto/SetAnalysisData';
import { FatigueRecoveryService } from './FatigueRecoveryService';
import { PlateauDetectionService } from './PlateauDetectionService';
import { ExperienceLevel, FitnessGoal } from '../../../domain/entities/User';
import { ExerciseLikeService } from '../ExerciseLikeService';
import adaptationConfig from '../../../config/adaptation.config';

export class IntelligentAdaptationService {
  // Используем множители из конфига
  private weightMultipliers: Record<ExperienceLevel, number> = {
    [ExperienceLevel.Beginner]: adaptationConfig.weightMultipliers.beginner,
    [ExperienceLevel.Novice]: adaptationConfig.weightMultipliers.novice,
    [ExperienceLevel.Intermediate]: adaptationConfig.weightMultipliers.intermediate,
    [ExperienceLevel.Advanced]: adaptationConfig.weightMultipliers.advanced,
    [ExperienceLevel.Master]: adaptationConfig.weightMultipliers.master,
  };

  // Базовые повторения из конфига
  private bodyweightRepsBase: Record<string, Record<ExperienceLevel, number>> = {
    'Отжимания': {
      [ExperienceLevel.Beginner]: adaptationConfig.bodyweightRepsBase['Отжимания'].beginner,
      [ExperienceLevel.Novice]: adaptationConfig.bodyweightRepsBase['Отжимания'].novice,
      [ExperienceLevel.Intermediate]: adaptationConfig.bodyweightRepsBase['Отжимания'].intermediate,
      [ExperienceLevel.Advanced]: adaptationConfig.bodyweightRepsBase['Отжимания'].advanced,
      [ExperienceLevel.Master]: adaptationConfig.bodyweightRepsBase['Отжимания'].master,
    },
    'Подтягивания': {
      [ExperienceLevel.Beginner]: adaptationConfig.bodyweightRepsBase['Подтягивания'].beginner,
      [ExperienceLevel.Novice]: adaptationConfig.bodyweightRepsBase['Подтягивания'].novice,
      [ExperienceLevel.Intermediate]: adaptationConfig.bodyweightRepsBase['Подтягивания'].intermediate,
      [ExperienceLevel.Advanced]: adaptationConfig.bodyweightRepsBase['Подтягивания'].advanced,
      [ExperienceLevel.Master]: adaptationConfig.bodyweightRepsBase['Подтягивания'].master,
    },
    'Приседания (собственный вес)': {
      [ExperienceLevel.Beginner]: adaptationConfig.bodyweightRepsBase['Приседания (собственный вес)'].beginner,
      [ExperienceLevel.Novice]: adaptationConfig.bodyweightRepsBase['Приседания (собственный вес)'].novice,
      [ExperienceLevel.Intermediate]: adaptationConfig.bodyweightRepsBase['Приседания (собственный вес)'].intermediate,
      [ExperienceLevel.Advanced]: adaptationConfig.bodyweightRepsBase['Приседания (собственный вес)'].advanced,
      [ExperienceLevel.Master]: adaptationConfig.bodyweightRepsBase['Приседания (собственный вес)'].master,
    },
  };

  constructor(
    private workoutRepo: IWorkoutRepository,
    private userRepo: IUserRepository,
    private fatigueService: FatigueRecoveryService,
    private plateauService: PlateauDetectionService,
    private likeService: ExerciseLikeService
  ) {}

  async initializeTargets(userId: number): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new Error('User not found');
    await this.workoutRepo.deleteGlobalAdaptations(userId);

    const splitPrograms = await this.workoutRepo.getSplitPrograms();
    const exerciseIds = new Set<number>();
    for (const program of splitPrograms) {
      for (const we of program.exercises) {
        if (we.exercise.id) exerciseIds.add(we.exercise.id);
      }
    }
    // Получаем дизлайки пользователя
    const disliked = await this.likeService.getDislikedExercises(userId);

    for (const exerciseId of exerciseIds) {
      // Если упражнение дизлайкнуто – создаём рекомендацию на замену
      if (disliked.includes(exerciseId)) {
        const substitution = await this.plateauService.suggestSubstitution(userId, exerciseId);
        if (substitution) {
          // Рекомендация уже создаётся внутри suggestSubstitution, ничего дополнительно не делаем
          console.log(`Упражнение ${exerciseId} дизлайкнуто, предложена замена на ${substitution}`);
      }
      // Всё равно создаём адаптацию с начальными целями (на случай если замены нет)
    }
      const templates = await this.workoutRepo.getExerciseMetricTemplates(exerciseId);
      const weightTemplate = templates.find(t => t.metricType === 'weight');
      const repsTemplate = templates.find(t => t.metricType === 'reps');
      let newWeight = weightTemplate?.defaultValue ?? 0;
      let newReps = repsTemplate?.defaultValue ?? 10;
      const multiplier = this.weightMultipliers[user.experienceLevel] || 1.0;
      if (weightTemplate && weightTemplate.defaultValue) {
        newWeight = Math.round(weightTemplate.defaultValue * multiplier);
        if (weightTemplate.unit === 'kg' && newWeight < 5) newWeight = 5;
        if (exerciseId === 5 && newWeight < 20) newWeight = 20;
      }
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

  async reinitializeTargets(userId: number): Promise<void> {
    await this.initializeTargets(userId);
  }

  async adaptExercise(
    userId: number,
    completedWorkoutId: number,
    exerciseId: number,
    muscleGroup: string,
    results: SetAnalysisData[],
    wellnessRating: number,
    goal: FitnessGoal = FitnessGoal.Maintenance
  ): Promise<WorkoutAdaptation | null> {
    // Проверка на дизлайк
    const disliked = await this.likeService.getDislikedExercises(userId);
    if (disliked.includes(exerciseId)) {
      const suggested = await this.plateauService.suggestSubstitution(userId, exerciseId);
      if (suggested) {
        return new WorkoutAdaptation({
          userId,
          exerciseId,
          previousWeight: 0,
          newWeight: 0,
          previousReps: 0,
          newReps: 0,
          adaptationType: AdaptationType.Substitution,
          reason: 'Пользователь отметил упражнение как нелюбимое. Предлагается замена.',
          suggestedExerciseId: suggested,
        });
      }
    }

    // Расчёт метрик восстановления
    const metrics = await this.fatigueService.calculateMetrics(userId);
    const muscleRecovery = metrics.muscleRecovery[muscleGroup] ?? 80;

    // Принудительная разгрузка при очень низком восстановлении
    if (muscleRecovery < adaptationConfig.forcedDeloadMuscleRecoveryThreshold) {
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

    // Адаптация в зависимости от цели
    switch (goal) {
      case FitnessGoal.Strength:
        if (avgReps >= targetReps * adaptationConfig.thresholdStrengthSuccess && trend > -5) {
          newWeight = Math.round(targetWeight * adaptationConfig.weightIncreaseStrength);
          adaptationType = AdaptationType.IncreaseWeight;
          reason = 'Цель: сила. Увеличение веса.';
        } else if (avgReps < targetReps * adaptationConfig.thresholdStrengthFailure) {
          newWeight = Math.round(targetWeight * adaptationConfig.weightDecreaseStrength);
          adaptationType = AdaptationType.DecreaseWeight;
          reason = 'Цель: сила. Снижение веса из-за недовыполнения.';
        }
        break;

      case FitnessGoal.MuscleGain:
      case FitnessGoal.Aesthetics:
        if (avgReps >= targetReps && targetReps < adaptationConfig.maxRepsHypertrophy) {
          newReps = Math.min(targetReps + adaptationConfig.repsIncreaseHypertrophy, adaptationConfig.maxRepsHypertrophy);
          adaptationType = AdaptationType.IncreaseReps;
          reason = 'Цель: гипертрофия. Увеличение повторений.';
        } else if (avgReps >= adaptationConfig.maxRepsHypertrophy && trend > 0) {
          newWeight = Math.round(targetWeight * adaptationConfig.weightIncreaseHypertrophy);
          newReps = targetReps;
          adaptationType = AdaptationType.IncreaseWeight;
          reason = 'Цель: гипертрофия. Увеличение веса.';
        } else if (avgReps < targetReps * adaptationConfig.thresholdHypertrophyFailure) {
          newWeight = Math.round(targetWeight * adaptationConfig.weightDecreaseHypertrophy);
          adaptationType = AdaptationType.DecreaseWeight;
          reason = 'Цель: гипертрофия. Снижение веса.';
        }
        break;

      case FitnessGoal.Endurance:
        if (avgReps >= targetReps && targetReps < adaptationConfig.maxRepsEndurance) {
          newReps = Math.min(targetReps + adaptationConfig.repsIncreaseEndurance, adaptationConfig.maxRepsEndurance);
          adaptationType = AdaptationType.IncreaseReps;
          reason = 'Цель: выносливость. Увеличение повторений.';
        } else if (avgReps < targetReps * adaptationConfig.thresholdEnduranceFailure && targetWeight > 0) {
          newWeight = Math.round(targetWeight * adaptationConfig.weightDecreaseHypertrophy);
          adaptationType = AdaptationType.DecreaseWeight;
          reason = 'Цель: выносливость. Снижение веса.';
        }
        break;

      default:
        if (avgReps >= targetReps && trend > 0) {
          newWeight = Math.round(targetWeight * adaptationConfig.weightIncreaseHypertrophy);
          adaptationType = AdaptationType.IncreaseWeight;
          reason = 'Стабильный прогресс. Повышение веса.';
        } else if (avgReps < targetReps * adaptationConfig.thresholdHypertrophyFailure && muscleRecovery < 70) {
          newWeight = Math.round(targetWeight * adaptationConfig.weightDecreaseHypertrophy);
          adaptationType = AdaptationType.DecreaseWeight;
          reason = 'Низкие повторения и восстановление. Снижение веса.';
        } else {
          reason = 'Без изменений.';
        }
        break;
    }

    // Проверка плато и замена упражнения
    let suggestedExerciseId: number | undefined;
    const isPlateau = await this.plateauService.isPlateau(userId, exerciseId);
    if (isPlateau) {
      const substitution = await this.plateauService.suggestSubstitution(userId, exerciseId);
      suggestedExerciseId = substitution ?? undefined;
      reason += ' Обнаружено плато. Рекомендуется смена упражнения.';
    }

    if (adaptationType === AdaptationType.NoChange && !suggestedExerciseId && reason === 'Без изменений.') {
      return null;
    }

    const adaptation = new WorkoutAdaptation({
      userId,
      exerciseId,
      previousWeight: targetWeight,
      newWeight,
      previousReps: targetReps,
      newReps,
      adaptationType,
      reason,
      suggestedExerciseId,
    });

    await this.workoutRepo.saveAdaptation(adaptation, completedWorkoutId);
    return adaptation;
  }
}