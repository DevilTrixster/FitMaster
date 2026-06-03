import { UserWorkout, MetricType, MetricTemplate } from '../../domain/entities';
import { WorkoutSchedulingService } from './workout/WorkoutSchedulingService';
import { WorkoutLifecycleService } from './workout/WorkoutLifecycleService';
import { WorkoutQueryService } from './workout/WorkoutQueryService';
import { WorkoutResultsService } from './workout/WorkoutResultsService';
import { IWorkoutRepository } from '@domain/interfaces/IWorkoutRepository';
import { IDeloadRepository } from '../../domain/interfaces/IDeloadRepository';

export class WorkoutService {
  constructor(
    private schedulingService: WorkoutSchedulingService,
    private lifecycleService: WorkoutLifecycleService,
    private queryService: WorkoutQueryService,
    private resultsService: WorkoutResultsService,
    private workoutRepository: IWorkoutRepository,
    private deloadRepo: IDeloadRepository  
  ) {}

  async saveSetMetrics(
    workoutId: number, userId: number, exerciseId: number,
    setNumber: number, setType: string,
    metrics: { metricType: MetricType; value: number; unit?: string }[]
  ): Promise<void> {
    return this.resultsService.saveSetMetrics(workoutId, userId, exerciseId, setNumber, setType, metrics);
  }

  async generateBaseProgram(userId: number): Promise<UserWorkout[]> {
    return this.schedulingService.generateBaseProgram(userId);
  }

  async getExerciseMetricTemplates(exerciseId: number): Promise<MetricTemplate[]> {
    return this.queryService.getExerciseMetricTemplates(exerciseId);
  }

  async getExerciseTargets(userId: number, exerciseId: number): Promise<{ reps: number; weight: number } | null> {
    const adaptation = await this.queryService.getLatestAdaptation(userId, exerciseId);
    if (!adaptation) return null;
    let reps = adaptation.newReps;
    let weight = adaptation.newWeight;

    // Применяем фактор разгрузки, если активна
    const deload = await this.deloadRepo.getActiveDeload(userId);
    if (deload) {
      reps = Math.max(1, Math.floor(reps * deload.intensityFactor));
      weight = Math.max(0, Math.floor(weight * deload.intensityFactor));
    }
    return { reps, weight };
  }

  async generateAdditionalWorkouts(userId: number, count: number): Promise<void> {
    return this.schedulingService.generateAdditionalWorkouts(userId, count);
  }

  async startWorkout(workoutId: number, userId: number): Promise<UserWorkout> {
    return this.lifecycleService.startWorkout(workoutId, userId);
  }

  async completeWorkout(workoutId: number, userId: number, wellnessRating?: number, comments?: string): Promise<void> {
    await this.lifecycleService.completeWorkout(workoutId, userId, wellnessRating, comments);
  }

  async pauseWorkout(workoutId: number, userId: number, lastExerciseIndex: number): Promise<void> {
    return this.lifecycleService.pauseWorkout(workoutId, userId, lastExerciseIndex);
  }

  async resumeWorkout(workoutId: number, userId: number): Promise<void> {
    return this.lifecycleService.resumeWorkout(workoutId, userId);
  }

  async getActiveWorkout(userId: number): Promise<UserWorkout | null> {
    return this.lifecycleService.getActiveWorkout(userId);
  }

  async getCurrentWorkout(userId: number): Promise<UserWorkout | null> {
    return this.lifecycleService.getCurrentWorkout(userId);
  }

  async getUpcomingWorkouts(userId: number, limit: number = 5): Promise<UserWorkout[]> {
    return this.queryService.getUpcomingWorkouts(userId, limit);
  }

  async getWorkoutHistory(
    userId: number, limit: number, offset: number,
    status?: string, dateFrom?: string, dateTo?: string
  ): Promise<UserWorkout[]> {
    return this.queryService.getWorkoutHistory(userId, limit, offset, status, dateFrom, dateTo);
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
    return this.queryService.getCompletedWorkoutsHistory(
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
    return this.queryService.countCompletedWorkouts(userId, dateFrom, dateTo, exerciseId, muscleGroup);
  }

  async getWorkoutDetails(workoutId: number, userId: number): Promise<any> {
    return this.queryService.getWorkoutDetails(workoutId, userId);
  }

  async getAllExercises() {
    return this.queryService.getAllExercises();
  }

  async triggerAdaptation(userId: number, completedWorkoutId: number, wellnessRating: number): Promise<void> {
    return this.resultsService.triggerAdaptation(userId, completedWorkoutId, wellnessRating);
  }

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