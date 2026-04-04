import { Workout, UserWorkout, Exercise, WorkoutAdaptation, SetResult } from '../entities/Workout';

export interface IWorkoutRepository {
  getWorkoutById(id: number): Promise<Workout | null>;
  getBaseWorkout(): Promise<Workout | null>;
  
  createUserWorkout(userWorkout: UserWorkout): Promise<UserWorkout>;
  getUserWorkouts(userId: number, limit?: number): Promise<UserWorkout[]>;
  getUserWorkoutById(id: number): Promise<UserWorkout | null>;
  updateUserWorkoutStatus(id: number, status: string, wellnessRating?: number, comments?: string): Promise<void>;
  startUserWorkout(id: number): Promise<void>;
  
  saveSetResult(userWorkoutId: number, exerciseId: number, setResult: SetResult): Promise<void>;
  getExerciseResults(userWorkoutId: number, exerciseId: number): Promise<SetResult[]>;
  
  getAllExercises(): Promise<Exercise[]>;
  
  saveAdaptation(adaptation: WorkoutAdaptation): Promise<void>;
  getUserAdaptations(userId: number, exerciseId: number, limit?: number): Promise<WorkoutAdaptation[]>;
  getWorkoutHistory(userId: number, limit?: number): Promise<UserWorkout[]>;
}