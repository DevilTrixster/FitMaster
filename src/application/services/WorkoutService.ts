import { UserWorkout, MetricType, MetricTemplate } from '../../domain/entities/Workout';
import { WorkoutSchedulingService } from './workout/WorkoutSchedulingService';
import { WorkoutLifecycleService } from './workout/WorkoutLifecycleService';
import { WorkoutQueryService } from './workout/WorkoutQueryService';
import { WorkoutResultsService } from './workout/WorkoutResultsService';
import { IWorkoutRepository } from '@domain/interfaces/IWorkoutRepository';

export class WorkoutService {
  constructor(
    private schedulingService: WorkoutSchedulingService,
    private lifecycleService: WorkoutLifecycleService,
    private queryService: WorkoutQueryService,
    private resultsService: WorkoutResultsService,
    private workoutRepository: IWorkoutRepository 
  ) {}

  // Сохранение метрик подхода
  async saveSetMetrics(
    workoutId: number, userId: number, exerciseId: number,
    setNumber: number, setType: string,
    metrics: { metricType: MetricType; value: number; unit?: string }[]
  ): Promise<void> {
    return this.resultsService.saveSetMetrics(workoutId, userId, exerciseId, setNumber, setType, metrics);
  }

  // Генерация базовой программы на 4 недели
  async generateBaseProgram(userId: number): Promise<UserWorkout[]> {
    return this.schedulingService.generateBaseProgram(userId);
  }

  // Получение шаблонов метрик упражнения
  async getExerciseMetricTemplates(exerciseId: number): Promise<MetricTemplate[]> {
    return this.queryService.getExerciseMetricTemplates(exerciseId);
  }

  // Текущие цели упражнения из последней адаптации
  async getExerciseTargets(userId: number, exerciseId: number): Promise<{ reps: number; weight: number } | null> {
    const adaptation = await this.queryService.getLatestAdaptation(userId, exerciseId);
    if (!adaptation) return null;
    return { reps: adaptation.newReps, weight: adaptation.newWeight };
  }

  // Генерация дополнительных тренировок
  async generateAdditionalWorkouts(userId: number, count: number): Promise<void> {
    return this.schedulingService.generateAdditionalWorkouts(userId, count);
  }

  // Начать тренировку
  async startWorkout(workoutId: number, userId: number): Promise<UserWorkout> {
    return this.lifecycleService.startWorkout(workoutId, userId);
  }

  // Завершить тренировку (запускает адаптацию)
  async completeWorkout(workoutId: number, userId: number, wellnessRating?: number, comments?: string): Promise<void> {
    await this.lifecycleService.completeWorkout(workoutId, userId, wellnessRating, comments);
  }

  // Поставить на паузу
  async pauseWorkout(workoutId: number, userId: number, lastExerciseIndex: number): Promise<void> {
    return this.lifecycleService.pauseWorkout(workoutId, userId, lastExerciseIndex);
  }

  // Возобновить
  async resumeWorkout(workoutId: number, userId: number): Promise<void> {
    return this.lifecycleService.resumeWorkout(workoutId, userId);
  }

  // Активная тренировка
  async getActiveWorkout(userId: number): Promise<UserWorkout | null> {
    return this.lifecycleService.getActiveWorkout(userId);
  }

  // Текущая тренировка (активная или запланированная)
  async getCurrentWorkout(userId: number): Promise<UserWorkout | null> {
    return this.lifecycleService.getCurrentWorkout(userId);
  }

  // Предстоящие тренировки
  async getUpcomingWorkouts(userId: number, limit: number = 5): Promise<UserWorkout[]> {
    return this.queryService.getUpcomingWorkouts(userId, limit);
  }

  // История тренировок с фильтрами
  async getWorkoutHistory(
    userId: number, limit: number, offset: number,
    status?: string, dateFrom?: string, dateTo?: string
  ): Promise<UserWorkout[]> {
    return this.queryService.getWorkoutHistory(userId, limit, offset, status, dateFrom, dateTo);
  }

  // Все упражнения каталога
  async getAllExercises() {
    return this.queryService.getAllExercises();
  }

  // Запуск адаптации вручную (обычно вызывается автоматически)
  async triggerAdaptation(userId: number, completedWorkoutId: number, wellnessRating: number): Promise<void> {
    return this.resultsService.triggerAdaptation(userId, completedWorkoutId, wellnessRating);
  }

  // Получение истории адаптаций
  async getAdaptations(userId: number, limit?: number) {
    return this.queryService.getAdaptations(userId, limit);
  }

  async getWorkoutsInRange(userId: number, startDate: Date, endDate: Date): Promise<UserWorkout[]> {
    return this.queryService.getWorkoutsInRange(userId, startDate, endDate);
  }

  async getUserWorkoutById(workoutId: number): Promise<UserWorkout | null> {
    return this.workoutRepository.getUserWorkoutById(workoutId);
  }

  async rescheduleWorkout(workoutId: number, newDate: Date, reason?: string): Promise<void> {
    return this.workoutRepository.rescheduleWorkout(workoutId, newDate, reason);
  }

  async postponeWorkout(workoutId: number, newDate: Date): Promise<void> {
    return this.workoutRepository.postponeWorkout(workoutId, newDate);
  }
}