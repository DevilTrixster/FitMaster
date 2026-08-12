import { AdaptationType } from '../enum';

export class WorkoutAdaptation {
  public readonly id?: number;
  public readonly userId: number;
  public readonly exerciseId: number;
  public readonly userWorkoutId?: number;
  public readonly previousWeight: number;
  public readonly newWeight: number;
  public readonly previousReps: number;
  public readonly newReps: number;
  public readonly adaptationType: AdaptationType;
  public readonly reason: string;
  public readonly suggestedExerciseId?: number;

  constructor(data: {
    id?: number;
    userId: number;
    exerciseId: number;
    userWorkoutId?: number;
    previousWeight: number;
    newWeight: number;
    previousReps: number;
    newReps: number;
    adaptationType: AdaptationType;
    reason: string;
    suggestedExerciseId?: number;
  }) {
    this.id = data.id;
    this.userId = data.userId;
    this.exerciseId = data.exerciseId;
    this.userWorkoutId = data.userWorkoutId;
    this.previousWeight = data.previousWeight;
    this.newWeight = data.newWeight;
    this.previousReps = data.previousReps;
    this.newReps = data.newReps;
    this.adaptationType = data.adaptationType;
    this.reason = data.reason;
    this.suggestedExerciseId = data.suggestedExerciseId;
  }
}