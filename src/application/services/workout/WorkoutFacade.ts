import { UserWorkout, MetricType, MetricTemplate } from '../../../domain/entities';
import { WorkoutSchedulingService } from './commands/WorkoutSchedulingService';
import { WorkoutLifecycleService } from './commands/WorkoutLifecycleService';
import { WorkoutResultsService } from './commands/WorkoutResultsService';
import { WorkoutRescheduleService } from './commands/WorkoutRescheduleService'
import { WorkoutQueryService } from './queries/WorkoutQueryService';
import { WorkoutTargetQueryService } from './queries/WorkoutTargetQueryService'

export class WorkoutFacade {
  constructor(
    private schedulingService: WorkoutSchedulingService,
    private lifecycleService: WorkoutLifecycleService,
    private queryService: WorkoutQueryService,
    private resultsService: WorkoutResultsService,
    private readonly rescheduleService: WorkoutRescheduleService,
    private readonly targetQueryService: WorkoutTargetQueryService
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

  async getExerciseTargets(userId: number, exerciseId: number) {
        return this.targetQueryService.getExerciseTargets(userId, exerciseId);
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
    return this.queryService.getActiveWorkout(userId);
  }

  async getCurrentWorkout(userId: number): Promise<UserWorkout | null> {
    return this.queryService.getCurrentWorkout(userId);
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

  async getUserWorkoutById(workoutId: number, userId: number): Promise<UserWorkout | null> {
    return this.rescheduleService.getUserWorkoutById(workoutId, userId);
  }

  async rescheduleWorkout(workoutId: number, userId: number, newDate: Date, reason?: string): Promise<void> {
    return this.rescheduleService.rescheduleWorkout(userId, workoutId, { newDate, reason });
  }

  async postponeWorkout(workoutId: number, userId: number, newDate: Date): Promise<void> {
    return this.rescheduleService.postponeWorkout(userId, workoutId, newDate);
  }
}