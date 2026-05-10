import { UserWorkout, MetricType, MetricTemplate } from '../../domain/entities/Workout';
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

  // Сохранение подхода с метриками
  async saveSetMetrics(
    workoutId: number,
    userId: number,
    exerciseId: number,
    setNumber: number,
    setType: string,
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

  // Метод для получения целей
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
  async completeWorkout(
    workoutId: number,
    userId: number,
    wellnessRating?: number,
    comments?: string
  ): Promise<void> {
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

  // Текущая (активная или запланированная)
  async getCurrentWorkout(userId: number): Promise<UserWorkout | null> {
    return this.lifecycleService.getCurrentWorkout(userId);
  }

  // Предстоящие тренировки
  async getUpcomingWorkouts(userId: number, limit: number = 5): Promise<UserWorkout[]> {
    return this.queryService.getUpcomingWorkouts(userId, limit);
  }

  // История тренировок
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

  // Все упражнения каталога
  async getAllExercises() {
    return this.queryService.getAllExercises();
  }

  // Рекомендации по замене
  async getExerciseSubstitutions(userId: number) {
    return this.queryService.getExerciseSubstitutions(userId);
  }

  // Запуск адаптации
  async triggerAdaptation(userId: number, completedWorkoutId: number, wellnessRating: number): Promise<void> {
    return this.resultsService.triggerAdaptation(userId, completedWorkoutId, wellnessRating);
  }
}