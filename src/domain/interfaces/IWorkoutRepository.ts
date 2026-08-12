import { Workout, UserWorkout, Exercise, WorkoutAdaptation, ExerciseSet } from '../entities';  
import { IMetricTemplate } from './IMetricTemplate';

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
  
  // Упражнения
  getAllExercises(): Promise<Exercise[]>;

  // Пропуск и перенос тренировок
  rescheduleWorkout(id: number, newDate: Date, reason?: string): Promise<void>;
  skipWorkout(id: number, reason?: string): Promise<void>;
  
  // Адаптация
  saveAdaptation(adaptation: WorkoutAdaptation, userWorkoutId?: number): Promise<void>;
  getUserAdaptations(userId: number, exerciseId: number, limit?: number): Promise<WorkoutAdaptation[]>;

  // Получение последней адаптации для пользователя и упражнения
  getLatestAdaptation(userId: number, exerciseId: number): Promise<WorkoutAdaptation | null>;
  
  // История с фильтрами (обновлённая сигнатура)
  getWorkoutHistory(
    userId: number,
    limit: number,
    offset: number,
    status?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<UserWorkout[]>;

  // Получение истории тренировок
  getCompletedWorkoutsHistory(
    userId: number,
    limit: number,
    offset: number,
    sortBy?: string,
    sortOrder?: 'ASC' | 'DESC',
    dateFrom?: string,
    dateTo?: string,
    exerciseId?: number,
    muscleGroup?: string
  ): Promise<UserWorkout[]>;

  // Количество завершения тренировок
  countCompletedWorkouts(
    userId: number,
    dateFrom?: string,
    dateTo?: string,
    exerciseId?: number,
    muscleGroup?: string
  ): Promise<number>;

  getWorkoutDetails(workoutId: number, userId: number): Promise<any>;

  // Получение списка базовых программ для сплита (Грудь, Спина, Ноги)
  getSplitPrograms(): Promise<Workout[]>;

  getExerciseById(id: number): Promise<Exercise | null>;

  // Получение шаблонов метрик для упражнения
  getExerciseMetricTemplates(exerciseId: number): Promise<IMetricTemplate[]>;

  // Сохранение подхода с метриками
  saveExerciseSet(userWorkoutExerciseId: number, exerciseSet: ExerciseSet): Promise<ExerciseSet>;

  // Получение подходов для упражнения в тренировке
  getExerciseSets(userWorkoutExerciseId: number): Promise<ExerciseSet[]>;

  getUserWorkoutExerciseId(userWorkoutId: number, exerciseId: number): Promise<number | null>;

  // Обновление времени у всех будущих запланированных тренировок пользователя
  updateFutureWorkoutsTime(userId: number, newTime: string): Promise<void>;

  getDailyWorkoutVolumes(userId: number, days: number): Promise<Array<{ date: string; volume: number }>>;

  getAllUserAdaptations(userId: number, limit?: number): Promise<WorkoutAdaptation[]>;

  // Календарь
  getWorkoutsInRange(userId: number, startDate: Date, endDate: Date): Promise<UserWorkout[]>;

  //  Регенерация тренировок при смене дней недели
  deleteScheduledWorkoutsFrom(userId: number, fromDate: Date): Promise<void>;
  createUserWorkoutBatch(workouts: UserWorkout[]): Promise<void>; // для массовой вставки

  postponeWorkout(workoutId: number, newDate: Date): Promise<void>;
  deleteGlobalAdaptations(userId: number): Promise<void>;
}