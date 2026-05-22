import { NotFoundError, UnauthorizedError, ValidationError, InternalServerError } from '../../../core/errors/ValidationError';
import { UserWorkout, WorkoutStatus } from '../../../domain/entities';
import { IWorkoutRepository } from '../../../domain/interfaces/IWorkoutRepository';
import { WorkoutResultsService } from './WorkoutResultsService';

export class WorkoutLifecycleService {
  constructor(
    private workoutRepository: IWorkoutRepository,
    private resultsService: WorkoutResultsService
  ) {}

  // Начать тренировку (с авто‑завершением предыдущей активной)
  async startWorkout(workoutId: number, userId: number): Promise<UserWorkout> {
    const activeWorkout = await this.workoutRepository.getUserActiveWorkout(userId);
    if (activeWorkout && activeWorkout.id !== workoutId) {
      await this.workoutRepository.updateUserWorkoutStatus(
        activeWorkout.id!, WorkoutStatus.Completed, 3,
        'Автоматически завершена при начале новой тренировки'
      );
    }

    const userWorkout = await this.workoutRepository.getUserWorkoutById(workoutId);
    if (!userWorkout) throw new NotFoundError('Тренировка не найдена');
    if (userWorkout.userId !== userId) throw new UnauthorizedError('Доступ запрещён');
    if (!userWorkout.canStart()) throw new ValidationError('Тренировку нельзя начать');

    await this.workoutRepository.startUserWorkout(workoutId);
    const updated = await this.workoutRepository.getUserWorkoutById(workoutId);
    if (!updated) throw new InternalServerError('Ошибка обновления тренировки');
    return updated;
  }

  // Завершить тренировку, запустить адаптацию
  async completeWorkout(workoutId: number, userId: number, wellnessRating?: number, comments?: string): Promise<void> {
    const userWorkout = await this.workoutRepository.getUserWorkoutById(workoutId);
    if (!userWorkout) throw new NotFoundError('Тренировка не найдена');
    if (userWorkout.userId !== userId) throw new UnauthorizedError('Доступ запрещён');

    // Проверить, есть ли хотя бы один сохранённый подход
    const exercises = userWorkout.workout.exercises;
    let hasSets = false;
    for (const ex of exercises) {
      const weId = await this.workoutRepository.getWorkoutExerciseId(workoutId, ex.exercise.id!);
      if (weId) {
        const sets = await this.workoutRepository.getExerciseSets(weId);
        if (sets.length > 0) {
          hasSets = true;
          break;
        }
      }
    }
    if (!hasSets) {
      throw new ValidationError('Нельзя завершить тренировку без выполненных подходов');
    }

    const rating = wellnessRating || 3;
    await this.workoutRepository.updateUserWorkoutStatus(workoutId, WorkoutStatus.Completed, rating, comments);
    await this.resultsService.triggerAdaptation(userId, workoutId, rating);
  }

  // Поставить тренировку на паузу
  async pauseWorkout(workoutId: number, userId: number, lastExerciseIndex: number): Promise<void> {
    const userWorkout = await this.workoutRepository.getUserWorkoutById(workoutId);
    if (!userWorkout) throw new NotFoundError('Тренировка не найдена');
    if (userWorkout.userId !== userId) throw new UnauthorizedError('Доступ запрещён');
    if (userWorkout.status !== WorkoutStatus.InProgress) throw new ValidationError('Неверный статус для паузы');
    await this.workoutRepository.pauseUserWorkout(workoutId, lastExerciseIndex);
  }

  // Возобновить тренировку
  async resumeWorkout(workoutId: number, userId: number): Promise<void> {
    const userWorkout = await this.workoutRepository.getUserWorkoutById(workoutId);
    if (!userWorkout) throw new NotFoundError('Тренировка не найдена');
    if (userWorkout.userId !== userId) throw new UnauthorizedError('Доступ запрещён');
    await this.workoutRepository.resumeUserWorkout(workoutId);
  }

  // Получить активную тренировку пользователя
  async getActiveWorkout(userId: number): Promise<UserWorkout | null> {
    return this.workoutRepository.getUserActiveWorkout(userId);
  }

  // Получить текущую тренировку (активную или запланированную) с упражнениями
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