import { SetResult, WorkoutAdaptation, AdaptationType } from '../../../domain/entities/Workout';
import { IWorkoutRepository } from '../../../domain/interfaces/IWorkoutRepository';
import { IUserRepository } from '../../../domain/interfaces/IUserRepository';
import { WorkoutAdaptationService } from '../WorkoutAdaptationService';

/**
 * Результаты тренировок и адаптация нагрузки
 * 
 * Этот сервис знает:
 * - как сохранять результаты отдельных подходов
 * - как запускать адаптацию после завершения тренировки
 * - как рассчитывать рекомендуемый вес (утилитарная логика)
 * 
 * НЕ знает:
 * - как управлять статусами тренировок
 * - как генерировать расписание
 * - как читать историю (только для адаптации)
 */
export class WorkoutResultsService {
  constructor(
    private workoutRepository: IWorkoutRepository,
    private userRepository: IUserRepository,
    private adaptationService: WorkoutAdaptationService
  ) {}

  /**
   * Сохраняет результат выполнения одного подхода
   */
  async saveSetResult(
    workoutId: number,
    userId: number,
    exerciseId: number,
    setResult: SetResult
  ): Promise<void> {
    const userWorkout = await this.workoutRepository.getUserWorkoutById(workoutId);
    if (!userWorkout || userWorkout.userId !== userId) {
      throw new Error('Доступ запрещён');
    }

    console.log('💾 WorkoutResultsService: сохраняем результат в БД...');
    await this.workoutRepository.saveSetResult(workoutId, exerciseId, setResult);
  }

  /**
   * Запускает логику адаптации после завершения тренировки
   * (оркестрация: собирает данные → вызывает адаптацию для каждого упражнения)
   */
  async triggerAdaptation(userId: number, completedWorkoutId: number, wellnessRating: number): Promise<void> {
    const userWorkout = await this.workoutRepository.getUserWorkoutById(completedWorkoutId);
    if (!userWorkout) return;

    // Проходим по каждому упражнению в завершенной тренировке
    for (const exercise of userWorkout.workout.exercises) {
      if (!exercise.exercise.id) continue;

      // Получаем результаты подходов
      const results = await this.workoutRepository.getExerciseResults(
        completedWorkoutId,
        exercise.exercise.id
      );

      // 🔹 Вызываем умный сервис адаптации (бизнес-правила вынесены туда)
      await this.adaptationService.adaptExercise(
        userId,
        completedWorkoutId,
        exercise,
        wellnessRating,
        results
      );
    }
  }

  /**
   * 🧮 Утилитарный метод: расчёт рекомендуемого веса по умолчанию
   * (можно вынести в отдельный Value Object или сервис, если логика усложнится)
   */
  calculateRecommendedWeight(userWeight: number, muscleGroup: string): number {
    const percentages: Record<string, number> = {
      'chest': 0.5,
      'back': 0.6,
      'legs': 0.75,
      'shoulders': 0.3,
      'core': 0,
      'arms': 0.4,
    };

    const basePercentage = percentages[muscleGroup] || 0.5;
    return Math.round(userWeight * basePercentage);
  }
}