import { UserWorkout, WorkoutStatus, MetricTemplate } from '../../../domain/entities';
import { IWorkoutRepository } from '../../../domain/interfaces/IWorkoutRepository';
import { WorkoutAdaptation } from '../../../domain/entities'
import { WorkoutSchedulingService } from './WorkoutSchedulingService';
import adaptationConfig from '../../../config/adaptation.config';

export class WorkoutQueryService {
  constructor(
    private workoutRepository: IWorkoutRepository,
    private schedulingService: WorkoutSchedulingService
  ) {}

  /**
   * Получает предстоящие тренировки с авто-очисткой просроченных
   */
  async getUpcomingWorkouts(userId: number, limit: number = 5): Promise<UserWorkout[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let upcomingWorkouts = await this.workoutRepository.getUserWorkouts(userId, 20)

    // Авто-пропуск просроченных
    for (const workout of upcomingWorkouts) {
      const workoutDate = new Date(workout.scheduledDate);
      workoutDate.setHours(0, 0, 0, 0);
      if (workoutDate < today && workout.status === WorkoutStatus.Scheduled) {
        await this.workoutRepository.updateUserWorkoutStatus(
          workout.id!,
          WorkoutStatus.Skipped,
          undefined,
          'Автоматически пропущена (дата прошла)'
        );
      }
    }

    // Фильтруем актуальные
    const filtered = upcomingWorkouts.filter(w =>
      w.status === WorkoutStatus.Scheduled || w.status === WorkoutStatus.InProgress
    );

    // НЕ ГЕНЕРИРУЕМ НОВЫЕ, ЕСЛИ УЖЕ ЕСТЬ (даже если их меньше лимита)
    // Просто возвращаем то, что есть
    return filtered.slice(0, limit);
  }

  /**
   * Получает историю тренировок с пагинацией и фильтрами
   */
  async getWorkoutHistory(
    userId: number,
    limit: number,
    offset: number,
    status?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<UserWorkout[]> {
    return this.workoutRepository.getWorkoutHistory(
      userId,
      limit,
      offset,
      status,
      dateFrom,
      dateTo
    );
  }

  /**
   * Получает все доступные упражнения из каталога
   */
  async getAllExercises() {
    return await this.workoutRepository.getAllExercises();
  }

  /**
   * Получает рекомендации по замене упражнений для пользователя
   */
  async getExerciseMetricTemplates(exerciseId: number): Promise<MetricTemplate[]> {
    return this.workoutRepository.getExerciseMetricTemplates(exerciseId);
  }

  async getLatestAdaptation(userId: number, exerciseId: number): Promise<WorkoutAdaptation | null> {
    return this.workoutRepository.getLatestAdaptation(userId, exerciseId);
  }

  async getAdaptations(userId: number, limit: number = adaptationConfig.defaultAdaptationsLimit) {
    return this.workoutRepository.getAllUserAdaptations(userId, limit);
  }

  async getWorkoutsInRange(userId: number, startDate: Date, endDate: Date): Promise<UserWorkout[]> {
    return this.workoutRepository.getWorkoutsInRange(userId, startDate, endDate);
  }

  async getCompletedWorkoutsHistory(
    userId: number,
    limit: number,
    offset: number,
    sortBy?: string,
    sortOrder?: 'ASC' | 'DESC',
    dateFrom?: string,
    dateTo?: string,
    exerciseId?: number,
    muscleGroup?: string
  ): Promise<UserWorkout[]> {
    return this.workoutRepository.getCompletedWorkoutsHistory(
      userId, limit, offset, sortBy, sortOrder, dateFrom, dateTo, exerciseId, muscleGroup
    );
  }

  async countCompletedWorkouts(
    userId: number,
    dateFrom?: string,
    dateTo?: string,
    exerciseId?: number,
    muscleGroup?: string
  ): Promise<number> {
    return this.workoutRepository.countCompletedWorkouts(userId, dateFrom, dateTo, exerciseId, muscleGroup);
  }

  async getWorkoutDetails(workoutId: number, userId: number): Promise<any> {
    return this.workoutRepository.getWorkoutDetails(workoutId, userId);
  }
}