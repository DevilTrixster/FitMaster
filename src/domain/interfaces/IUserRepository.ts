import { User } from '../entities/User';

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
}