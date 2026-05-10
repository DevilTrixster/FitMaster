import { User } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { IWorkoutRepository } from '../../domain/interfaces/IWorkoutRepository';
import { NotFoundError } from '../../core/errors/ValidationError';

export class ProfileService {
  constructor(
    private userRepository: IUserRepository,
    private workoutRepository: IWorkoutRepository
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

  // Синхронизация времени будущих тренировок
  async updateFutureWorkoutsTime(userId: number, newTime: string): Promise<void> {
    await this.workoutRepository.updateFutureWorkoutsTime(userId, newTime);
  }
}