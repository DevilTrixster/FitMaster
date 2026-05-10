import { IWorkoutRepository } from '../../../domain/interfaces/IWorkoutRepository';
import { WorkoutAdaptation, AdaptationType } from '../../../domain/entities/Workout';

export class PlateauDetectionService {
  constructor(private workoutRepo: IWorkoutRepository) {}

  async isPlateau(userId: number, exerciseId: number): Promise<boolean> {
    const adaptations = await this.workoutRepo.getUserAdaptations(userId, exerciseId, 6);
    if (adaptations.length < 4) return false;

    // Проверяем последние 4 адаптации: все NoChange или Decrease => застой
    const recent = adaptations.slice(0, 4);
    return recent.every(a => a.adaptationType === AdaptationType.NoChange || a.adaptationType === AdaptationType.DecreaseWeight);
  }

  async shouldDeload(userId: number): Promise<boolean> {
    // Проверить все упражнения пользователя: если по большинству застой -> deload
    return false; // упростим
  }
}