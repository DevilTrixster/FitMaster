import { User } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { IWorkoutRepository } from '../../domain/interfaces/IWorkoutRepository';
import { NotFoundError } from '../../core/errors/ValidationError';
import { WorkoutSchedulingService } from './workout/WorkoutSchedulingService';

export class ProfileService {
  constructor(
    private userRepository: IUserRepository,
    private workoutRepository: IWorkoutRepository,
    private workoutSchedulingService: WorkoutSchedulingService
  ) {}

  // Получение профиля пользователя
  async getProfile(userId: number): Promise<User | null> {
    return await this.userRepository.findById(userId);
  }

  // Обновление данных профиля и времени тренировок
  async updateProfile(
    userId: number,
    data: {
      nickname?: string;
      firstName?: string;
      lastName?: string;
      height?: number;
      weight?: number;
      preferredWorkoutTime?: string;
    }
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError('Пользователь не найден');

    const { preferredWorkoutTime, ...rest } = data;
    if (Object.keys(rest).length > 0) {
      await this.userRepository.updateUserFields(userId, rest);
    }

    // Если время тренировки изменилось – обновляем все будущие тренировки
    if (preferredWorkoutTime !== undefined) {
      await this.workoutRepository.updateFutureWorkoutsTime(userId, preferredWorkoutTime);
    }
  }

  async updateAvatar(userId: number, avatarUrl: string): Promise<void> {
    await this.userRepository.updateAvatar(userId, avatarUrl);
  }

  async getPreferredDays(userId: number): Promise<number[]> {
    return this.userRepository.getPreferredDays(userId);
  }

  async updatePreferredDays(userId: number, days: number[]): Promise<void> {
    await this.userRepository.updatePreferredDays(userId, days);
    await this.workoutSchedulingService.regenerateFutureWorkouts(userId, days);
  }

  // Синхронизация времени будущих тренировок
  async updateFutureWorkoutsTime(userId: number, newTime: string): Promise<void> {
    await this.workoutRepository.updateFutureWorkoutsTime(userId, newTime);
  }
}