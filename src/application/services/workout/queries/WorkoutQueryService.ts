import adaptationConfig from '../../../../config/adaptation.config';
import { UserWorkout, WorkoutStatus, MetricTemplate, WorkoutAdaptation } from '../../../../domain/entities';
import { IWorkoutRepository } from '../../../../domain/interfaces/IWorkoutRepository';
import { WorkoutSchedulingService } from '../commands/WorkoutSchedulingService';

/**
 * Сервис запросов (Read) для тренировок.
 * Предоставляет все методы получения данных: история, предстоящие,адаптации, цели упражнений с учётом разгрузки.
 * Зависимости (3): IWorkoutRepository, WorkoutSchedulingService, IDeloadRepository.
 */
export class WorkoutQueryService {
  constructor(
    private workoutRepository: IWorkoutRepository,
    private schedulingService: WorkoutSchedulingService
  ) {}

  // Получает историю тренировок с пагинацией и фильтрами
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

  async getWorkoutDetails(workoutId: number, userId: number): Promise<any> {
    return this.workoutRepository.getWorkoutDetails(workoutId, userId);
  }

  // Получает рекомендации по замене упражнений для пользователя
  async getExerciseMetricTemplates(exerciseId: number): Promise<MetricTemplate[]> {
    return this.workoutRepository.getExerciseMetricTemplates(exerciseId);
  }

  // Получает предстоящие тренировки с авто-очисткой просроченных
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

  // Получает все доступные упражнения из каталога
  async getAllExercises() {
    return await this.workoutRepository.getAllExercises();
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

  // Получить активную тренировку пользователя
  async getActiveWorkout(userId: number): Promise<UserWorkout | null> {
    return this.workoutRepository.getUserActiveWorkout(userId);
  }

  // Получить текущую тренировку (активную или запланированную) с упражнениями
  async getCurrentWorkout(userId: number): Promise<UserWorkout | null> {
    const upcoming = await this.workoutRepository.getUserWorkouts(userId, 10);
    const workout = upcoming.find(
      w => w.status === WorkoutStatus.Scheduled || w.status === WorkoutStatus.InProgress
    );
    if (!workout) return null;

    const fullWorkout = await this.workoutRepository.getUserWorkoutById(workout.id!);
    if (!fullWorkout) return null;

    const workoutWithExercises = await this.workoutRepository.getWorkoutById(fullWorkout.workout.id!);
    if (workoutWithExercises) {
      (fullWorkout as any).workout.exercises = workoutWithExercises.exercises;
    }
    return fullWorkout;
  }
}