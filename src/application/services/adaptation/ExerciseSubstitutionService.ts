import { IWorkoutRepository } from '../../../domain/interfaces/IWorkoutRepository';
import { WorkoutExercise } from '../../../domain/entities/Workout';
import { getAlternativeExercises } from '../../../domain/utils/ExerciseAlternatives';
import { AdaptationType } from '../../../domain/entities/Workout';

export class ExerciseSubstitutionService {
  constructor(private workoutRepository: IWorkoutRepository) {}

   // Предлагает замену упражнения, если обнаружен застой (3+ снижения подряд).
  async suggestSubstitutionIfStalled(
    userId: number,
    exercise: WorkoutExercise,
    recentAdaptations: any[]
  ): Promise<void> {
    if (!exercise.exercise.id) return;

    const lastThree = recentAdaptations.slice(0, 3);
    const consecutiveDecreases = lastThree.filter(
      a => a.adaptationType === AdaptationType.DecreaseWeight
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