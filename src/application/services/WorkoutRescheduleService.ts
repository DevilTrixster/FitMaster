import { IWorkoutRepository } from '../../domain/interfaces/IWorkoutRepository';
import { RescheduleWorkoutDTO } from '../dto/RescheduleWorkoutDTO';
import { validateRescheduleDate } from '../../core/utils/validators';
import { NotFoundError, ValidationError } from '../../core/errors/ValidationError';

export class WorkoutRescheduleService {
  constructor(private workoutRepo: IWorkoutRepository) {}

  async reschedule(userId: number, workoutId: number, dto: RescheduleWorkoutDTO): Promise<void> {
    // 1. Проверка существования и принадлежности пользователю
    const workout = await this.workoutRepo.getUserWorkoutById(workoutId);
    if (!workout || workout.userId !== userId) {
      throw new NotFoundError('Тренировка не найдена или доступ запрещён');
    }

    // 2. Бизнес-правила: нельзя менять завершённые/пропущенные
    if (workout.status === 'completed' || workout.status === 'skipped') {
      throw new ValidationError('Нельзя изменить статус завершённой или пропущенной тренировки');
    }

    // 3. Валидация даты (используем утилиту из core/)
    validateRescheduleDate(dto.newDate, new Date());

    // 4. Выполнение операции
    const newDate = new Date(dto.newDate);
    await this.workoutRepo.rescheduleWorkout(workoutId, newDate, dto.reason);
  }

  async skip(userId: number, workoutId: number, reason?: string): Promise<void> {
    const workout = await this.workoutRepo.getUserWorkoutById(workoutId);
    if (!workout || workout.userId !== userId) {
      throw new NotFoundError('Тренировка не найдена или доступ запрещён');
    }

    if (workout.status === 'completed') {
      throw new ValidationError('Нельзя пропустить уже завершённую тренировку');
    }

    await this.workoutRepo.skipWorkout(workoutId, reason);
  }
}