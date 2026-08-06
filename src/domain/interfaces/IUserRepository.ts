import { User } from '../entities/User';

// Интерфейс пользователя
export interface IUserRepository {
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByNickname(nickname: string): Promise<User | null>;
  createUser(user: User): Promise<User>; 
  updateUserFields(userId: number, fields: {
    nickname?: string;
    firstName?: string;
    lastName?: string;
    height?: number;
    weight?: number;
  }): Promise<void>;
  updateAvatar(userId: number, avatarUrl: string): Promise<void>;
  updatePreferredDays(userId: number, days: number[]): Promise<void>;
  getPreferredDays(userId: number): Promise<number[]>;
  getAllUserIds(): Promise<number[]>;
}