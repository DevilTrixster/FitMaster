import { IWorkoutRepository } from '../../../domain/interfaces/IWorkoutRepository';
import { IUserRepository } from '../../../domain/interfaces/IUserRepository';
import { ExperienceLevel } from '../../../domain/entities/User';
import { WorkoutAdaptation, AdaptationType } from '../../../domain/entities/Workout';

export class InitialTargetsService {
  constructor(
    private workoutRepo: IWorkoutRepository,
    private userRepo: IUserRepository
  ) {}

  // Коэффициенты веса в зависимости от уровня
  private weightMultipliers: Record<ExperienceLevel, number> = {
    [ExperienceLevel.Beginner]: 0.4,
    [ExperienceLevel.Novice]: 0.7,
    [ExperienceLevel.Intermediate]: 1.0,
    [ExperienceLevel.Advanced]: 1.2,
    [ExperienceLevel.Master]: 1.5,
  };

  // Базовые повторения для упражнений с собственным весом (пример)
  private bodyweightRepsBase: Record<string, Record<ExperienceLevel, number>> = {
    'Отжимания': { beginner: 5, novice: 10, intermediate: 15, advanced: 20, master: 30 },
    'Подтягивания': { beginner: 1, novice: 3, intermediate: 6, advanced: 10, master: 15 },
    'Приседания (собственный вес)': { beginner: 10, novice: 15, intermediate: 20, advanced: 30, master: 40 },
    // можно добавить другие
  };

  /**
   * Удаляет все глобальные адаптации пользователя (без привязки к тренировке)
   * и создаёт новые на основе текущего уровня и цели.
   */
  async initializeTargets(userId: number): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new Error('User not found');

    // 1. Удаляем все глобальные адаптации (user_workout_id IS NULL)
    await this.workoutRepo.deleteGlobalAdaptations(userId);

    // 2. Получаем все упражнения из сплит-программ
    const splitPrograms = await this.workoutRepo.getSplitPrograms();
    const exerciseIds = new Set<number>();
    for (const program of splitPrograms) {
      for (const we of program.exercises) {
        if (we.exercise.id) exerciseIds.add(we.exercise.id);
      }
    }

    // 3. Для каждого упражнения вычисляем начальные вес/повторения
    for (const exerciseId of exerciseIds) {
      const templates = await this.workoutRepo.getExerciseMetricTemplates(exerciseId);
      const weightTemplate = templates.find(t => t.metricType === 'weight');
      const repsTemplate = templates.find(t => t.metricType === 'reps');

      let newWeight = weightTemplate?.defaultValue ?? 0;
      let newReps = repsTemplate?.defaultValue ?? 10;

      // Корректировка по уровню
      const multiplier = this.weightMultipliers[user.experienceLevel] || 1.0;
      if (weightTemplate && weightTemplate.defaultValue) {
        newWeight = Math.round(weightTemplate.defaultValue * multiplier);
        // Обеспечиваем минимальный вес (пустой гриф 20 кг для штанги, 5 кг для гантелей)
        if (weightTemplate.unit === 'kg' && newWeight < 5) newWeight = 5;
        if (exerciseId === 5 && newWeight < 20) newWeight = 20; // жим лёжа – минимум 20 кг
      }

      // Корректировка повторений для упражнений с собственным весом
      const exercise = await this.workoutRepo.getExerciseById(exerciseId);
      if (exercise && exercise.equipmentType === 'bodyweight' && repsTemplate) {
        const exerciseName = exercise.name;
        const rule = this.bodyweightRepsBase[exerciseName];
        if (rule) {
          newReps = rule[user.experienceLevel] || rule.novice;
        } else {
          newReps = Math.max(1, Math.round(newReps * multiplier));
        }
      } else if (repsTemplate) {
        // Для обычных упражнений повторения не меняем от уровня
        newReps = repsTemplate.defaultValue ?? 10;
      }

      // Сохраняем адаптацию
      const adaptation = new WorkoutAdaptation({
        userId,
        exerciseId,
        previousWeight: 0,
        newWeight,
        previousReps: 0,
        newReps,
        adaptationType: AdaptationType.NoChange,
        reason: `Initial targets based on level ${user.experienceLevel}`,
      });
      await this.workoutRepo.saveAdaptation(adaptation);
    }
  }

  /**
   * Вызывается при изменении уровня или цели в профиле.
   */
  async reinitializeTargets(userId: number): Promise<void> {
    await this.initializeTargets(userId);
  }
}