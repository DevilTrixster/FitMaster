import { Workout, UserWorkout, Exercise } from '../entities/Workout';

export interface IWorkoutRepository {
  // Базовые программы
  getWorkoutById(id: number): Promise<Workout | null>;
  getBaseWorkout(): Promise<Workout | null>;
  
  // Пользовательские тренировки
  createUserWorkout(userWorkout: UserWorkout): Promise<UserWorkout>;
  getUserWorkouts(userId: number, limit?: number): Promise<UserWorkout[]>;
  getUserWorkoutById(id: number): Promise<UserWorkout | null>;
  updateUserWorkoutStatus(id: number, status: string, wellnessRating?: number, comments?: string): Promise<void>;
  
  // Упражнения
  getAllExercises(): Promise<Exercise[]>;
}