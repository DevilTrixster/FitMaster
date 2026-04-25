import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { User } from '../../domain/entities/User';

export class ProfileService {
  constructor(private userRepo: IUserRepository) {}

  async getProfile(userId: number): Promise<User | null> {
    return await this.userRepo.findById(userId);
  }

  async updateProfile(userId: number, updateData: Partial<User>): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new Error('Пользователь не найден');

    // ✅ Используем новый метод репозитория
    await this.userRepo.updateUserFields(userId, {
      nickname: updateData.nickname,
      firstName: updateData.firstName,
      lastName: updateData.lastName,
      height: updateData.height !== undefined ? Number(updateData.height) : undefined,
      weight: updateData.weight !== undefined ? Number(updateData.weight) : undefined,
    });
  }
}