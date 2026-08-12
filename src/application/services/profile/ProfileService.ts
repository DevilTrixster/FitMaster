import { User, ExperienceLevel, FitnessGoal } from '../../../domain/entities';
import { IUserRepository } from '../../../domain/interfaces/IUserRepository';
import { IWorkoutRepository } from '../../../domain/interfaces/IWorkoutRepository';
import { NotFoundError } from '../../../core/errors/ValidationError';
import { WorkoutSchedulingService } from '../workout/commands/WorkoutSchedulingService';
import { IntelligentAdaptationService } from '../adaptation/IntelligentAdaptationService';

export class ProfileService {
  constructor(
    private userRepository: IUserRepository,
    private workoutRepository: IWorkoutRepository,
    private workoutSchedulingService: WorkoutSchedulingService,
    private adaptationService: IntelligentAdaptationService   // изменено
  ) {}

  async getProfile(userId: number): Promise<User | null> {
    return await this.userRepository.findById(userId);
  }

  async updateProfile(
    userId: number,
    data: {
      nickname?: string;
      firstName?: string;
      lastName?: string;
      height?: number;
      weight?: number;
      preferredWorkoutTime?: string;
      experienceLevel?: ExperienceLevel;
      fitnessGoal?: FitnessGoal;
    }
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError('Пользователь не найден');

    const { preferredWorkoutTime, experienceLevel, fitnessGoal, ...rest } = data;
    if (Object.keys(rest).length > 0) {
      await this.userRepository.updateUserFields(userId, rest);
    }

    if (preferredWorkoutTime !== undefined) {
      await this.workoutRepository.updateFutureWorkoutsTime(userId, preferredWorkoutTime);
    }

    // Если изменились уровень или цель – пересчитываем начальные цели упражнений
    if (experienceLevel !== undefined || fitnessGoal !== undefined) {
      const fields: any = {};
      if (experienceLevel !== undefined) fields.experienceLevel = experienceLevel;
      if (fitnessGoal !== undefined) fields.fitnessGoal = fitnessGoal;
      await this.userRepository.updateUserFields(userId, fields);
      await this.adaptationService.reinitializeTargets(userId);
    }
  }

  async updateAvatar(userId: number, avatarUrl: string): Promise<void> {
    await this.userRepository.updateAvatar(userId, avatarUrl);
  }

  async getPreferredDays(userId: number): Promise<number[]> {
    return this.userRepository.getPreferredDays(userId);
  }

  async updatePreferredDays(userId: number, days: number[]): Promise<void> {
    console.log(`📅 ProfileService.updatePreferredDays for user ${userId}:`, days);
    await this.userRepository.updatePreferredDays(userId, days);
    console.log('✅ Preferred days updated, regenerating workouts...');
    await this.workoutSchedulingService.regenerateFutureWorkouts(userId, days);
    console.log('🏋️ Workouts regenerated');
  }

  async updateFutureWorkoutsTime(userId: number, newTime: string): Promise<void> {
    await this.workoutRepository.updateFutureWorkoutsTime(userId, newTime);
  }
}