import { UserWorkout, WorkoutStatus, SetResult } from '../../domain/entities/Workout';
import { WorkoutSchedulingService } from './workout/WorkoutSchedulingService';
import { WorkoutLifecycleService } from './workout/WorkoutLifecycleService';
import { WorkoutQueryService } from './workout/WorkoutQueryService';
import { WorkoutResultsService } from './workout/WorkoutResultsService';


export class WorkoutService {
  constructor(
    private schedulingService: WorkoutSchedulingService,
    private lifecycleService: WorkoutLifecycleService,
    private queryService: WorkoutQueryService,
    private resultsService: WorkoutResultsService
  ) {}

  // ==========  ПЛАНИРОВАНИЕ ==========
  
  /**
   * Генерирует базовую программу тренировок на 4 недели
   */
  async generateBaseProgram(userId: number): Promise<UserWorkout[]> {
    return this.schedulingService.generateBaseProgram(userId);
  }

  /**
   * Генерирует дополнительные тренировки, если их не хватает
   */
  async generateAdditionalWorkouts(userId: number, count: number): Promise<void> {
    return this.schedulingService.generateAdditionalWorkouts(userId, count);
  }

  // ==========  ЖИЗНЕННЫЙ ЦИКЛ ==========

  /**
   * Начинает тренировку (проверки + обновление статуса)
   */
  async startWorkout(workoutId: number, userId: number): Promise<UserWorkout> {
    return this.lifecycleService.startWorkout(workoutId, userId);
  }

  /**
   * Завершает тренировку + запускает адаптацию
   */
  async completeWorkout(
    workoutId: number,
    userId: number,
    wellnessRating?: number,
    comments?: string
  ): Promise<void> {
    await this.lifecycleService.completeWorkout(workoutId, userId, wellnessRating, comments);
    // Адаптация запускается внутри lifecycleService через resultsService
  }

  /**
   * Ставит тренировку на паузу
   */
  async pauseWorkout(workoutId: number, userId: number, lastExerciseIndex: number): Promise<void> {
    return this.lifecycleService.pauseWorkout(workoutId, userId, lastExerciseIndex);
  }

  /**
   * Возобновляет тренировку с паузы
   */
  async resumeWorkout(workoutId: number, userId: number): Promise<void> {
    return this.lifecycleService.resumeWorkout(workoutId, userId);
  }

  /**
   * Получает активную (незавершённую) тренировку пользователя
   */
  async getActiveWorkout(userId: number): Promise<UserWorkout | null> {
    return this.lifecycleService.getActiveWorkout(userId);
  }

  /**
   * Получает текущую тренировку (следующую запланированную или активную)
   */
  async getCurrentWorkout(userId: number): Promise<UserWorkout | null> {
    return this.lifecycleService.getCurrentWorkout(userId);
  }

  // ==========  ЧТЕНИЕ ДАННЫХ ==========

  /**
   * Получает список предстоящих тренировок с авто-очисткой просроченных
   */
  async getUpcomingWorkouts(userId: number, limit: number = 5): Promise<UserWorkout[]> {
    return this.queryService.getUpcomingWorkouts(userId, limit);
  }

  /**
   * Получает историю тренировок с фильтрацией
   */
  async getWorkoutHistory(
    userId: number,
    limit: number,
    offset: number,
    status?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<UserWorkout[]> {
    return this.queryService.getWorkoutHistory(userId, limit, offset, status, dateFrom, dateTo);
  }

  /**
   * Получает все доступные упражнения из каталога
   */
  async getAllExercises() {
    return this.queryService.getAllExercises();
  }

  /**
   * Получает рекомендации по замене упражнений для пользователя
   */
  async getExerciseSubstitutions(userId: number) {
    return this.queryService.getExerciseSubstitutions(userId);
  }

  // ==========  РЕЗУЛЬТАТЫ И АДАПТАЦИЯ ==========

  /**
   * Сохраняет результат выполнения одного подхода
   */
  async saveSetResult(
    workoutId: number,
    userId: number,
    exerciseId: number,
    setResult: SetResult
  ): Promise<void> {
    return this.resultsService.saveSetResult(workoutId, userId, exerciseId, setResult);
  }

  /**
   * Запускает логику адаптации после завершения тренировки
   */
  async triggerAdaptation(userId: number, completedWorkoutId: number, wellnessRating: number): Promise<void> {
    return this.resultsService.triggerAdaptation(userId, completedWorkoutId, wellnessRating);
  }
}