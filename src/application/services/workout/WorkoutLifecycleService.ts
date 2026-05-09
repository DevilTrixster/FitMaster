import { UserWorkout, WorkoutStatus } from '../../../domain/entities/Workout';
import { IWorkoutRepository } from '../../../domain/interfaces/IWorkoutRepository';
import { WorkoutResultsService } from './WorkoutResultsService';

export class WorkoutLifecycleService {
  constructor(
    private workoutRepository: IWorkoutRepository,
    private resultsService: WorkoutResultsService
  ) {}

  /** Начать тренировку: проверки, авто-завершение предыдущей, обновление статуса */
  async startWorkout(workoutId: number, userId: number): Promise<UserWorkout> {
    // Завершаем старую активную тренировку, если есть
    const activeWorkout = await this.workoutRepository.getUserActiveWorkout(userId);
    if (activeWorkout && activeWorkout.id !== workoutId) {
      console.log(`⚠️ Автозавершение старой тренировки #${activeWorkout.id}`);
      await this.workoutRepository.updateUserWorkoutStatus(
        activeWorkout.id!,
        WorkoutStatus.Completed,
        3,
        'Автоматически завершена при начале новой тренировки'
      );
    }

    const userWorkout = await this.workoutRepository.getUserWorkoutById(workoutId);
    if (!userWorkout) throw new Error('Тренировка не найдена');
    if (userWorkout.userId !== userId) throw new Error('Доступ запрещён');
    if (!userWorkout.canStart()) throw new Error('Тренировку нельзя начать');

    await this.workoutRepository.startUserWorkout(workoutId);

    const updated = await this.workoutRepository.getUserWorkoutById(workoutId);
    if (!updated) throw new Error('Ошибка обновления тренировки');
    return updated;
  }

  /** Завершить тренировку и запустить адаптацию */
  async completeWorkout(
    workoutId: number,
    userId: number,
    wellnessRating?: number,
    comments?: string
  ): Promise<void> {
    const userWorkout = await this.workoutRepository.getUserWorkoutById(workoutId);
    if (!userWorkout) throw new Error('Тренировка не найдена');
    if (userWorkout.userId !== userId) throw new Error('Доступ запрещён');

    const rating = wellnessRating || 3;

    await this.workoutRepository.updateUserWorkoutStatus(
      workoutId,
      WorkoutStatus.Completed,
      rating,
      comments
    );

    await this.resultsService.triggerAdaptation(userId, workoutId, rating);
  }

  /** Поставить тренировку на паузу */
  async pauseWorkout(workoutId: number, userId: number, lastExerciseIndex: number): Promise<void> {
    const userWorkout = await this.workoutRepository.getUserWorkoutById(workoutId);
    if (!userWorkout || userWorkout.userId !== userId) {
      throw new Error('Тренировка не найдена или доступ запрещён');
    }
    if (userWorkout.status !== WorkoutStatus.InProgress) {
      throw new Error('Нельзя поставить на паузу незавершённую тренировку');
    }
    await this.workoutRepository.pauseUserWorkout(workoutId, lastExerciseIndex);
  }

  /** Возобновить тренировку */
  async resumeWorkout(workoutId: number, userId: number): Promise<void> {
    const userWorkout = await this.workoutRepository.getUserWorkoutById(workoutId);
    if (!userWorkout || userWorkout.userId !== userId) {
      throw new Error('Тренировка не найдена или доступ запрещён');
    }
    await this.workoutRepository.resumeUserWorkout(workoutId);
  }

  /** Получить активную тренировку */
  async getActiveWorkout(userId: number): Promise<UserWorkout | null> {
    return this.workoutRepository.getUserActiveWorkout(userId);
  }

  /** Получить текущую тренировку (запланированную или активную) с упражнениями */
  async getCurrentWorkout(userId: number): Promise<UserWorkout | null> {
    const upcoming = await this.workoutRepository.getUserWorkouts(userId, 10);
    const workout = upcoming.find(
      w => w.status === WorkoutStatus.Scheduled || w.status === WorkoutStatus.InProgress
    );
    if (!workout) return null;

    const fullWorkout = await this.workoutRepository.getUserWorkoutById(workout.id!);
    if (!fullWorkout) return null;

    const workoutWithExercises = await this.workoutRepository.getWorkoutById(fullWorkout.workout.id!);
    if (workoutWithExercises) {
      (fullWorkout as any).workout.exercises = workoutWithExercises.exercises;
    }
    return fullWorkout;
  }
}