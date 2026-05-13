import { UserWorkout, WorkoutStatus, MetricTemplate } from '../../../domain/entities/Workout';
import { IWorkoutRepository } from '../../../domain/interfaces/IWorkoutRepository';
import { WorkoutAdaptation } from '../../../domain/entities/Workout'
import { WorkoutSchedulingService } from './WorkoutSchedulingService';

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

    const upcomingWorkouts = await this.workoutRepository.getUserWorkouts(userId, 20);

    // Авто-помечаем просроченные как пропущенные
    for (const workout of upcomingWorkouts) {
      const workoutDate = new Date(workout.scheduledDate);
      workoutDate.setHours(0, 0, 0, 0);

      if (workoutDate < today && workout.status === WorkoutStatus.Scheduled) {
        console.log(`⏰ Пропускаем устаревшую тренировку: #${workout.id}`);
        await this.workoutRepository.updateUserWorkoutStatus(
          workout.id!,
          WorkoutStatus.Skipped,
          undefined,
          'Автоматически пропущена (дата прошла)'
        );
      }
    }

    // Фильтруем только актуальные статусы
    const filtered = upcomingWorkouts.filter(w =>
      w.status === WorkoutStatus.Scheduled || w.status === WorkoutStatus.InProgress
    );

    // Если ничего нет — генерируем новые (делегирование)
    if (filtered.length === 0) {
      console.log('⚠️ Нет предстоящих тренировок. Генерируем новые...');
      await this.schedulingService.generateAdditionalWorkouts(userId, 5);
      const newWorkouts = await this.workoutRepository.getUserWorkouts(userId, 5);
      return newWorkouts.filter(w =>
        w.status === WorkoutStatus.Scheduled || w.status === WorkoutStatus.InProgress
      );
    }

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

  async getAdaptations(userId: number, limit: number = 20) {
    return this.workoutRepository.getAllUserAdaptations(userId, limit);
  }

  async getWorkoutsInRange(userId: number, startDate: Date, endDate: Date): Promise<UserWorkout[]> {
    return this.workoutRepository.getWorkoutsInRange(userId, startDate, endDate);
  }
}