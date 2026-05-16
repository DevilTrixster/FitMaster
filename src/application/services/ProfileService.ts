import { User, ExperienceLevel, FitnessGoal } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { IWorkoutRepository } from '../../domain/interfaces/IWorkoutRepository';
import { NotFoundError } from '../../core/errors/ValidationError';
import { WorkoutSchedulingService } from './workout/WorkoutSchedulingService';
import { InitialTargetsService } from './adaptation/IntelligentAdaptationService';

export class ProfileService {
  constructor(
    private userRepository: IUserRepository,
    private workoutRepository: IWorkoutRepository,
    private workoutSchedulingService: WorkoutSchedulingService,
    private initialTargetsService: InitialTargetsService
  ) {}

  // Получение профиля пользователя по ID.
  async getProfile(userId: number): Promise<User | null> {
    return await this.userRepository.findById(userId);
  }

  /**
   * Обновление данных профиля.
   * - Если изменилось предпочтительное время – обновляет будущие тренировки.
   * - Если изменился уровень опыта или цель – пересчитывает начальные цели упражнений.
   */
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

    // Обновление времени тренировок
    if (preferredWorkoutTime !== undefined) {
      await this.workoutRepository.updateFutureWorkoutsTime(userId, preferredWorkoutTime);
    }

    // Обновление уровня/цели и пересчёт начальных целей
    if (experienceLevel !== undefined || fitnessGoal !== undefined) {
      const fieldsToUpdate: any = {};
      if (experienceLevel !== undefined) fieldsToUpdate.experienceLevel = experienceLevel;
      if (fitnessGoal !== undefined) fieldsToUpdate.fitnessGoal = fitnessGoal;
      await this.userRepository.updateUserFields(userId, fieldsToUpdate);
      await this.initialTargetsService.reinitializeTargets(userId);
    }
  }

  // Обновление URL аватара пользователя.
  async updateAvatar(userId: number, avatarUrl: string): Promise<void> {
    await this.userRepository.updateAvatar(userId, avatarUrl);
  }

  // Получение предпочтительных дней тренировок. 
  async getPreferredDays(userId: number): Promise<number[]> {
    return this.userRepository.getPreferredDays(userId);
  }

  // Обновление предпочтительных дней тренировок и перегенерация расписания. 
  async updatePreferredDays(userId: number, days: number[]): Promise<void> {
    console.log(`📅 ProfileService.updatePreferredDays for user ${userId}:`, days);
    await this.userRepository.updatePreferredDays(userId, days);
    console.log('✅ Preferred days updated in DB, now regenerating workouts...');
    await this.workoutSchedulingService.regenerateFutureWorkouts(userId, days);
    console.log('🏋️ Workouts regenerated');
  }

  // Синхронизация времени всех будущих тренировок.
  async updateFutureWorkoutsTime(userId: number, newTime: string): Promise<void> {
    await this.workoutRepository.updateFutureWorkoutsTime(userId, newTime);
  }
}