import { IWorkoutRepository } from '../../../domain/interfaces/IWorkoutRepository';
import { WorkoutAdaptation, AdaptationType } from '../../../domain/entities/Workout';

export class PlateauDetectionService {
  constructor(private workoutRepo: IWorkoutRepository) {}

   //Проверяет, находится ли упражнение в застое (застоем считаются 4 последние адаптации без прогресса)
  async isPlateau(userId: number, exerciseId: number): Promise<boolean> {
    const adaptations = await this.workoutRepo.getUserAdaptations(userId, exerciseId, 6);
    if (adaptations.length < 4) return false;

    const recent = adaptations.slice(0, 4);
    return recent.every(
      a => a.adaptationType === AdaptationType.NoChange || a.adaptationType === AdaptationType.DecreaseWeight
    );
  }

  // Заглушка для будущей реализации автоматической разгрузочной недели
  async shouldDeload(userId: number): Promise<boolean> {
    return false;
  }
}