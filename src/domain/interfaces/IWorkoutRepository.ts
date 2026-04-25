import { Workout, UserWorkout, Exercise, WorkoutAdaptation, SetResult } from '../entities/Workout';

export interface IWorkoutRepository {
  // Базовые программы
  getWorkoutById(id: number): Promise<Workout | null>;
  getBaseWorkout(): Promise<Workout | null>;
  
  // Пользовательские тренировки
  createUserWorkout(userWorkout: UserWorkout): Promise<UserWorkout>;
  getUserWorkouts(userId: number, limit?: number): Promise<UserWorkout[]>;
  getUserWorkoutById(id: number): Promise<UserWorkout | null>;
  updateUserWorkoutStatus(id: number, status: string, wellnessRating?: number, comments?: string): Promise<void>;
  startUserWorkout(id: number): Promise<void>;
  
  // Новые методы для паузы/возобновления
  pauseUserWorkout(id: number, lastExerciseIndex: number): Promise<void>;
  resumeUserWorkout(id: number): Promise<void>;
  getUserActiveWorkout(userId: number): Promise<UserWorkout | null>;
  
  // Результаты подходов
  saveSetResult(userWorkoutId: number, exerciseId: number, setResult: SetResult): Promise<void>;
  getExerciseResults(userWorkoutId: number, exerciseId: number): Promise<SetResult[]>;
  
  // Упражнения
  getAllExercises(): Promise<Exercise[]>;

  // Пропуск и перенос тренировок
  rescheduleWorkout(id: number, newDate: Date, reason?: string): Promise<void>;
  skipWorkout(id: number, reason?: string): Promise<void>;
  
  // Адаптация
  saveAdaptation(adaptation: WorkoutAdaptation): Promise<void>;
  getUserAdaptations(userId: number, exerciseId: number, limit?: number): Promise<WorkoutAdaptation[]>;
  
  // История с фильтрами (обновлённая сигнатура)
  getWorkoutHistory(
    userId: number, 
    limit: number, 
    offset: number,
    status?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<UserWorkout[]>;

  // Получение списка базовых программ для сплита (Грудь, Спина, Ноги)
  getSplitPrograms(): Promise<Workout[]>;
}