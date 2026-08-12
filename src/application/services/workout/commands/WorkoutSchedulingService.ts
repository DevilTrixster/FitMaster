import adaptationConfig from '../../../../config/adaptation.config';
import { IWorkoutRepository } from '../../../../domain/interfaces/IWorkoutRepository';
import { IUserRepository } from '../../../../domain/interfaces/IUserRepository';
import { IExerciseRecommendationRepository } from '../../../../domain/interfaces/IExerciseRecommendationRepository';
import { UserWorkout, WorkoutStatus, Workout, WorkoutExercise } from '../../../../domain/entities';
import { FitnessGoal, ExperienceLevel } from '../../../../domain/entities';

export class WorkoutSchedulingService {
  constructor(
    private workoutRepository: IWorkoutRepository,
    private userRepository: IUserRepository,
    private recommendationRepo: IExerciseRecommendationRepository
  ) {}

  async generateBaseProgram(userId: number): Promise<UserWorkout[]> {
    let preferredDays = await this.userRepository.getPreferredDays(userId);
    if (!preferredDays.length) {
      preferredDays = [1, 3, 5];
      await this.userRepository.updatePreferredDays(userId, preferredDays);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await this.workoutRepository.deleteScheduledWorkoutsFrom(userId, today);

    const workouts = await this.generateWorkoutsForDays(userId, preferredDays, 4);
    await this.workoutRepository.createUserWorkoutBatch(workouts);
    return workouts;
  }

  async generateAdditionalWorkouts(userId: number, count: number = 5): Promise<void> {
    const preferredDays = await this.userRepository.getPreferredDays(userId);
    if (!preferredDays.length) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = await this.workoutRepository.getUserWorkouts(userId, count);
    const upcoming = existing.filter(w => w.status === WorkoutStatus.Scheduled && new Date(w.scheduledDate) >= today);
    if (upcoming.length >= count) return;

    const workouts = await this.generateWorkoutsForDays(userId, preferredDays, 4);
    await this.workoutRepository.createUserWorkoutBatch(workouts);
  }

  // Рассчитывает время отдыха между подходами в секундах на основе цели тренировок и уровня опыта пользователя.
  private calculateRestSeconds(goal: FitnessGoal, experienceLevel: ExperienceLevel): number {
    let baseRest: number;
    switch (goal) {
      case FitnessGoal.Strength:
        baseRest = 180; // 3 минуты для силовых
        break;
      case FitnessGoal.MuscleGain:
      case FitnessGoal.Aesthetics:
        baseRest = 90; // 1.5 минуты для гипертрофии
        break;
      case FitnessGoal.Endurance:
        baseRest = 45; // 45 секунд для выносливости
        break;
      default:
        baseRest = 60; // 1 минута по умолчанию
    }
    // Новичкам и начинающим нужно больше времени на восстановление
    if (experienceLevel === ExperienceLevel.Beginner || experienceLevel === ExperienceLevel.Novice) {
      baseRest = Math.round(baseRest * 1.2);
    }
    return baseRest;
  }

  // Применяет активные рекомендации по замене упражнений и пересчитывает время отдыха.
  private async applySubstitutions(
    userId: number,
    exercises: WorkoutExercise[],
    goal: FitnessGoal,
    experienceLevel: ExperienceLevel
  ): Promise<WorkoutExercise[]> {
    const recommendations = await this.recommendationRepo.getActiveRecommendations(userId);
    const recMap = new Map<number, number>();
    for (const rec of recommendations) {
      recMap.set(rec.exerciseId, rec.suggestedExerciseId);
    }

    const newExercises: WorkoutExercise[] = [];
    const dynamicRest = this.calculateRestSeconds(goal, experienceLevel);

    for (const ex of exercises) {
      let exerciseToUse = ex.exercise;
      const suggestedId = recMap.get(ex.exercise.id!);
      if (suggestedId) {
        const suggestedExercise = await this.workoutRepository.getExerciseById(suggestedId);
        if (suggestedExercise) {
          exerciseToUse = suggestedExercise;
          const rec = recommendations.find(r => r.exerciseId === ex.exercise.id!);
          if (rec?.id) await this.recommendationRepo.markApplied(rec.id);
        }
      }
      newExercises.push(new WorkoutExercise({
        exercise: exerciseToUse,
        sets: ex.sets,
        restSeconds: dynamicRest, // динамическое время отдыха
        orderIndex: ex.orderIndex,
      }));
    }
    return newExercises;
  }

  async regenerateFutureWorkouts(userId: number, days: number[]): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await this.workoutRepository.deleteScheduledWorkoutsFrom(userId, today);
    const workouts = await this.generateWorkoutsForDays(userId, days, 6);
    if (workouts.length) {
      await this.workoutRepository.createUserWorkoutBatch(workouts);
    }
  }

  private async generateWorkoutsForDays(
    userId: number,
    days: number[],
    weeksCount: number
  ): Promise<UserWorkout[]> {
    if (!days.length) return [];

    const sortedDays = [...days].sort((a, b) => a - b);

    const splitPrograms = await this.workoutRepository.getSplitPrograms();
    if (!splitPrograms.length) throw new Error('Нет программ тренировок');

    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error('Пользователь не найден');
    const defaultTime = user.preferredWorkoutTime || adaptationConfig.defaultPreferredWorkoutTime;
    const goal = user.fitnessGoal;
    const level = user.experienceLevel;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const toNormDay = (date: Date) => {
      const d = date.getDay();
      return d === 0 ? 7 : d;
    };

    const result: UserWorkout[] = [];

    for (let week = 0; week < weeksCount; week++) {
      const baseDate = new Date(today);
      baseDate.setDate(today.getDate() + week * 7);

      for (let idx = 0; idx < sortedDays.length; idx++) {
        const targetDay = sortedDays[idx];
        let diff = targetDay - toNormDay(baseDate);
        if (diff < 0) diff += 7;
        const targetDate = new Date(baseDate);
        targetDate.setDate(baseDate.getDate() + diff);

        if (targetDate < today) continue;

        const programIndex = (week * sortedDays.length + idx) % splitPrograms.length;
        const program = splitPrograms[programIndex];
        const substitutedExercises = await this.applySubstitutions(userId, program.exercises, goal, level);
        const substitutedProgram = new Workout({
          id: program.id,
          name: program.name,
          description: program.description,
          frequencyPerWeek: program.frequencyPerWeek,
          exercises: substitutedExercises,
        });
        result.push(new UserWorkout({
          userId,
          workout: substitutedProgram,
          scheduledDate: targetDate,
          scheduledTime: defaultTime,
          status: WorkoutStatus.Scheduled,
        }));
      }
    }
    return result;
  }
}