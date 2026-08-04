import { IWorkoutRepository } from '../../../../domain/interfaces/IWorkoutRepository';
import { RescheduleWorkoutDTO } from '../../../dto/RescheduleWorkoutDTO';
import { validateDateInFuture } from '../../../../core/utils/validators';
import { NotFoundError, ValidationError } from '../../../../core/errors/ValidationError';

export class WorkoutRescheduleService {
  constructor(private workoutRepository: IWorkoutRepository) {}

   // Перенос тренировки на другую дату (через DTO)
   async rescheduleWorkout(userId: number, workoutId: number, dto: RescheduleWorkoutDTO): Promise<void> {
    const workout = await this.workoutRepository.getUserWorkoutById(workoutId);
    if (!workout || workout.userId !== userId) {
      throw new NotFoundError('Тренировка не найдена или доступ запрещён');
    }

    if (workout.status === 'completed' || workout.status === 'skipped') {
      throw new ValidationError('Нельзя изменить статус завершённой или пропущенной тренировки');
    }

    // Проверяем, что дата корректна и не в прошлом
    validateDateInFuture(dto.newDate, 'newDate');

    await this.workoutRepository.rescheduleWorkout(workoutId, dto.newDate, dto.reason);
  }

  async getUserWorkoutById(workoutId: number, userId: number) {
    return this.workoutRepository.getUserWorkoutById(workoutId);
  }

  // Перенос (откладывание) тренировки на новую дату
  async postponeWorkout(userId: number, workoutId: number, newDate: Date): Promise<void> {
    const workout = await this.workoutRepository.getUserWorkoutById(workoutId);
    if (!workout || workout.userId !== userId) {
      throw new NotFoundError('Тренировка не найдена или доступ запрещён');
    }

    if (workout.status === 'completed') {
      throw new ValidationError('Нельзя перенести уже завершённую тренировку');
    }

    validateDateInFuture(newDate, 'newDate');
    await this.workoutRepository.postponeWorkout(workoutId, newDate);
  }
}