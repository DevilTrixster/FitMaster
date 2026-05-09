import { IWorkoutRepository } from '../../../domain/interfaces/IWorkoutRepository';
import { WorkoutExercise } from '../../../domain/entities/Workout';
import { getAlternativeExercises } from '../../../domain/utils/ExerciseAlternatives';

export class ExerciseSubstitutionService {
  constructor(private workoutRepository: IWorkoutRepository) {}

  /**
   * Анализирует историю адаптаций и, если обнаружен застой (3+ снижения подряд),
   * предлагает замену упражнения.
   */
  async suggestSubstitutionIfStalled(
    userId: number,
    exercise: WorkoutExercise,
    recentAdaptations: any[] // массив WorkoutAdaptation, можно уточнить тип
  ): Promise<void> {
    if (!exercise.exercise.id) return;

    const lastThree = recentAdaptations.slice(0, 3);
    const consecutiveDecreases = lastThree.filter(
      a => a.adaptationType === 'decrease_weight'
    ).length;

    if (consecutiveDecreases >= 3) {
      const alternatives = getAlternativeExercises(exercise.exercise.id);
      if (alternatives.length > 0) {
        const best = alternatives[0];
        await this.workoutRepository.saveExerciseSubstitution(
          userId,
          exercise.exercise.id,
          best.alternativeExerciseId,
          best.reason
        );
        console.log(`💡 Предложена замена: "${exercise.exercise.name}" → ${best.reason}`);
      }
    }
  }
}