import { IWorkoutRepository } from '../../../domain/interfaces/IWorkoutRepository';
import { IUserRepository } from '../../../domain/interfaces/IUserRepository';
import {
  WorkoutAdaptation,
  AdaptationType,
  WorkoutExercise,
  MetricType,
} from '../../../domain/entities/Workout';
import { SetAnalysisData } from '../../dto/SetAnalysisData'; // общий интерфейс
import { ExerciseSubstitutionService } from './ExerciseSubstitutionService';

export class WorkoutAdaptationService {
  constructor(
    private workoutRepo: IWorkoutRepository,
    private userRepo: IUserRepository,
    private substitutionService: ExerciseSubstitutionService
  ) {}

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
    if (results.length === 0) return null;

    // Анализ выполнения
    const completedResults = results.filter(r => r.completed && !r.skipped);
    const skippedResults = results.filter(r => r.skipped);
    const failedResults = results.filter(r => {
      if (r.skipped) return false;
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

    const lastAdaptations = await this.workoutRepo.getUserAdaptations(
      userId,
      exercise.exercise.id,
      5
    );
    const consecutiveIncreases = lastAdaptations.filter(
      a => a.adaptationType === AdaptationType.IncreaseWeight
    ).length;

    const targetReps = results.find(r => r.targetReps !== undefined)?.targetReps ?? 10;
    const targetWeight = results.find(r => r.targetWeight !== undefined)?.targetWeight ?? 0;

    let adaptationType: AdaptationType | null = null;
    let newWeight = targetWeight;
    let newRepsMin = targetReps;
    let newRepsMax = targetReps;
    let reason = '';

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

    if (!adaptationType) return null;

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

    await this.workoutRepo.saveAdaptation(adaptation);
    console.log(`✅ Адаптация сохранена: ${exercise.exercise.name}`);

    // Проверка застоя и автоматическое предложение замены
    await this.substitutionService.suggestSubstitutionIfStalled(
      userId,
      exercise,
      lastAdaptations
    );

    return adaptation;
  }
}