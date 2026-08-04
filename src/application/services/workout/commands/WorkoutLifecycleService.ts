import { NotFoundError, UnauthorizedError, ValidationError, InternalServerError } from '../../../../core/errors/ValidationError';
import { UserWorkout, WorkoutStatus } from '../../../../domain/entities';
import { IWorkoutRepository } from '../../../../domain/interfaces/IWorkoutRepository';
import { WorkoutResultsService } from './WorkoutResultsService';

export class WorkoutLifecycleService {
  constructor(
    private workoutRepository: IWorkoutRepository,
    private resultsService: WorkoutResultsService
  ) {}

  // Начать тренировку (с авто‑завершением предыдущей активной)
  async startWorkout(workoutId: number, userId: number): Promise<UserWorkout> {
    const activeWorkout = await this.workoutRepository.getUserActiveWorkout(userId);
    if (activeWorkout && activeWorkout.id !== workoutId) {
      await this.workoutRepository.updateUserWorkoutStatus(
        activeWorkout.id!, WorkoutStatus.Completed, 3,
        'Автоматически завершена при начале новой тренировки'
      );
    }

    const userWorkout = await this.workoutRepository.getUserWorkoutById(workoutId);
    if (!userWorkout) throw new NotFoundError('Тренировка не найдена');
    if (userWorkout.userId !== userId) throw new UnauthorizedError('Доступ запрещён');
    if (!userWorkout.canStart()) throw new ValidationError('Тренировку нельзя начать');

    await this.workoutRepository.startUserWorkout(workoutId);
    const updated = await this.workoutRepository.getUserWorkoutById(workoutId);
    if (!updated) throw new InternalServerError('Ошибка обновления тренировки');
    return updated;
  }

  // Поставить тренировку на паузу
  async pauseWorkout(workoutId: number, userId: number, lastExerciseIndex: number): Promise<void> {
    const userWorkout = await this.workoutRepository.getUserWorkoutById(workoutId);
    if (!userWorkout) throw new NotFoundError('Тренировка не найдена');
    if (userWorkout.userId !== userId) throw new UnauthorizedError('Доступ запрещён');
    if (userWorkout.status !== WorkoutStatus.InProgress) throw new ValidationError('Неверный статус для паузы');
    await this.workoutRepository.pauseUserWorkout(workoutId, lastExerciseIndex);
  }

  // Возобновить тренировку
  async resumeWorkout(workoutId: number, userId: number): Promise<void> {
    const userWorkout = await this.workoutRepository.getUserWorkoutById(workoutId);
    if (!userWorkout) throw new NotFoundError('Тренировка не найдена');
    if (userWorkout.userId !== userId) throw new UnauthorizedError('Доступ запрещён');
    await this.workoutRepository.resumeUserWorkout(workoutId);
  }

  // Завершить тренировку, запустить адаптацию
  async completeWorkout(workoutId: number, userId: number, wellnessRating?: number, comments?: string): Promise<void> {
    const userWorkout = await this.workoutRepository.getUserWorkoutById(workoutId);
    if (!userWorkout) throw new NotFoundError('Тренировка не найдена');
    if (userWorkout.userId !== userId) throw new UnauthorizedError('Доступ запрещён');

    // === Новая валидация ===
    let allSetsCompleted = true;
    const missingSets: string[] = [];

    for (const exercise of userWorkout.workout.exercises) {
      const weId = await this.workoutRepository.getWorkoutExerciseId(workoutId, exercise.exercise.id!);
      if (!weId) continue;
      const savedSets = await this.workoutRepository.getExerciseSets(weId);
      // Считаем, что подход выполнен, если у него есть хотя бы одна метрика (или тип не normal, но для простоты – проверяем metrics.length)
      const completedCount = savedSets.filter(s => s.metrics.length > 0).length;
      if (completedCount < exercise.sets) {
        allSetsCompleted = false;
        missingSets.push(`${exercise.exercise.name} (${completedCount}/${exercise.sets})`);
      }
    }

    if (!allSetsCompleted) {
      throw new ValidationError(`Не все подходы выполнены: ${missingSets.join(', ')}`);
    }

    const rating = wellnessRating || 3;
    await this.workoutRepository.updateUserWorkoutStatus(workoutId, WorkoutStatus.Completed, rating, comments);
    await this.resultsService.triggerAdaptation(userId, workoutId, rating);
  }
}