import { IWorkoutRepository } from '../../domain/interfaces/IWorkoutRepository';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import {
  WorkoutAdaptation,
  AdaptationType,
  WorkoutExercise,
  MetricType,
} from '../../domain/entities/Workout';
import { getAlternativeExercises } from '../../domain/utils/ExerciseAlternatives';
import { SetAnalysisData } from './workout/WorkoutResultsService';

export class WorkoutAdaptationService {
  constructor(
    private workoutRepo: IWorkoutRepository,
    private userRepo: IUserRepository
  ) {}

  /**
   * Анализирует выполнение упражнения и возвращает адаптацию, если требуется.
   *
   * @param results - данные о выполненных подходах (метрики + цели)
   */
  async adaptExercise(
    userId: number,
    completedWorkoutId: number,
    exercise: WorkoutExercise,
    wellnessRating: number,
    results: SetAnalysisData[]
  ): Promise<WorkoutAdaptation | null> {
    if (!exercise.exercise.id) {
      console.warn(`Упражнение "${exercise.exercise.name}" не имеет ID`);
      return null;
    }

    if (results.length === 0) {
      console.log('⚠️ Нет результатов для адаптации');
      return null;
    }

    // 1. Анализ выполнения
    const completedResults = results.filter(r => r.completed && !r.skipped);
    const skippedResults = results.filter(r => r.skipped);
    const failedResults = results.filter(r => {
      if (r.skipped) return false;
      // Неудача: если нет данных по повторениям или они ниже целевого
      if (r.reps === undefined || r.reps === null) return false;
      if (r.targetReps === undefined || r.targetReps === null) return false;
      return r.reps < r.targetReps * 0.8;
    });

    const allSuccessful =
      completedResults.length > 0 &&
      completedResults.every(r => {
        if (r.reps === undefined || r.reps === null) return false;
        if (r.targetReps === undefined || r.targetReps === null) return true;
        return r.reps >= r.targetReps;
      });
    const anyFailed = failedResults.length > 0;
    const skippedCount = skippedResults.length;
    const totalSets = results.length;

    console.log(`📊 Анализ: всего=${totalSets}, успешно=${completedResults.length}, пропущено=${skippedCount}, провалено=${failedResults.length}`);

    // 2. История адаптаций (последние 5)
    const lastAdaptations = await this.workoutRepo.getUserAdaptations(
      userId,
      exercise.exercise.id,
      5
    );

    const consecutiveIncreases = lastAdaptations.filter(
      a => a.adaptationType === AdaptationType.IncreaseWeight
    ).length;

    // 3. Определяем новые значения (берём текущие из первой попавшейся цели)
    const targetReps =
      results.find(r => r.targetReps !== undefined)?.targetReps ?? 10;
    const targetWeight =
      results.find(r => r.targetWeight !== undefined)?.targetWeight ?? 0;

    let adaptationType: AdaptationType | null = null;
    let newWeight = targetWeight;
    let newRepsMin = targetReps;
    let newRepsMax = targetReps;
    let reason = '';

    // Сценарии
    if (skippedCount > totalSets / 2) {
      newWeight = Math.round(newWeight * 0.85);
      adaptationType = AdaptationType.DecreaseWeight;
      reason = `Пропущено ${skippedCount} из ${totalSets} подходов. Снижение нагрузки.`;
    } else if (wellnessRating <= 2) {
      newWeight = Math.round(newWeight * 0.9);
      adaptationType = AdaptationType.DecreaseWeight;
      reason = `Низкое самочувствие (${wellnessRating}/5). Разгрузка.`;
    } else if (anyFailed) {
      newWeight = Math.round(newWeight * 0.9);
      adaptationType = AdaptationType.DecreaseWeight;
      reason = 'Невыполнение повторений. Снижение веса.';
    } else if (allSuccessful) {
      if (consecutiveIncreases >= 3) {
        newRepsMin = targetReps + 1;
        newRepsMax = targetReps + 1;
        adaptationType = AdaptationType.IncreaseReps;
        reason = 'Стабилизация веса, увеличение повторений.';
      } else {
        const increasePercent = 0.025 + Math.random() * 0.025;
        newWeight = Math.round(newWeight * (1 + increasePercent));
        adaptationType = AdaptationType.IncreaseWeight;
        reason = `Успех. Прогрессия веса (+${Math.round(increasePercent * 100)}%).`;
      }
    }

    if (!adaptationType) {
      console.log('➡️ Адаптация не требуется');
      return null;
    }

    // 4. Создаём запись адаптации (используем старые поля для совместимости с таблицей)
    const adaptation = new WorkoutAdaptation({
      userId,
      exerciseId: exercise.exercise.id!,
      previousWeight: targetWeight,
      newWeight,
      previousReps: targetReps,
      newReps: newRepsMin,
      adaptationType,
      reason,
    });

    // 5. Проверка на застой и предложение замены
    if (anyFailed && lastAdaptations.length >= 3) {
      const consecutiveFailures = lastAdaptations.filter(
        a => a.adaptationType === AdaptationType.DecreaseWeight
      ).length;

      if (consecutiveFailures >= 3) {
        const alternatives = getAlternativeExercises(exercise.exercise.id!);
        if (alternatives.length > 0) {
          const best = alternatives[0];
          await this.workoutRepo.saveExerciseSubstitution(
            userId,
            exercise.exercise.id!,
            best.alternativeExerciseId,
            best.reason
          );
          console.log(`💡 Предложена замена: "${exercise.exercise.name}" → ${best.reason}`);
        }
      }
    }

    await this.workoutRepo.saveAdaptation(adaptation);
    console.log(`✅ Адаптация сохранена: ${exercise.exercise.name}`);
    return adaptation;
  }
}