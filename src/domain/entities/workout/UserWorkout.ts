import { Workout } from './Workout';
import { WorkoutStatus } from '../enum';

export class UserWorkout {
  public readonly id?: number;
  public readonly userId: number;
  public readonly workout: Workout;
  public readonly scheduledDate: Date;
  public readonly scheduledTime?: string;
  public readonly status: WorkoutStatus;
  public readonly completedAt?: Date;
  public readonly wellnessRating?: number;
  public readonly comments?: string;
  public readonly startedAt?: Date;
  public readonly pausedAt?: Date;
  public readonly lastExerciseIndex?: number;
  public readonly rescheduledTo?: Date;
  public readonly rescheduleReason?: string;

  constructor(data: {
    id?: number;
    userId: number;
    workout: Workout;
    scheduledDate: Date;
    scheduledTime?: string;
    status: WorkoutStatus;
    completedAt?: Date;
    wellnessRating?: number;
    comments?: string;
    startedAt?: Date;
    pausedAt?: Date;
    lastExerciseIndex?: number;
    rescheduledTo?: Date;
    rescheduleReason?: string;
  }) {
    this.id = data.id;
    this.userId = data.userId;
    this.workout = data.workout;
    this.scheduledDate = data.scheduledDate;
    this.scheduledTime = data.scheduledTime;
    this.status = data.status;
    this.completedAt = data.completedAt;
    this.wellnessRating = data.wellnessRating;
    this.comments = data.comments;
    this.startedAt = data.startedAt;
    this.pausedAt = data.pausedAt;
    this.lastExerciseIndex = data.lastExerciseIndex;
    this.rescheduledTo = data.rescheduledTo;
    this.rescheduleReason = data.rescheduleReason;
  }

  public canStart(): boolean {
    return this.status === WorkoutStatus.Scheduled;
  }

  public isInProgress(): boolean {
    return this.status === WorkoutStatus.InProgress;
  }

  public isPaused(): boolean {
    return this.status === WorkoutStatus.InProgress && this.pausedAt !== undefined;
  }

  public canResume(): boolean {
    return this.status === WorkoutStatus.InProgress;
  }
}