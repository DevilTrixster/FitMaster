import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, Gender } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { WorkoutService } from './WorkoutService';

export class AuthService {
  constructor(
    private userRepository: IUserRepository,
    private workoutService: WorkoutService 
  ) {}

  // Регистрация нового пользователя
  async register(data: {
    nickname: string;
    password: string;
    email: string;
    firstName: string;
    lastName: string;
    birthDate: Date;
    gender: Gender;
    height: number;
    weight: number;
  }): Promise<{ user: User; token: string }> {
    // ... (проверки и хеширование без изменений)
    const existingByEmail = await this.userRepository.findByEmail(data.email);
    if (existingByEmail) {
      throw new Error('Пользователь с таким email уже существует');
    }

    const existingByNickname = await this.userRepository.findByNickname(data.nickname);
    if (existingByNickname) {
      throw new Error('Пользователь с таким никнеймом уже существует');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);

    const user = new User({
      ...data,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.createUser(user);
    const token = this.generateToken(savedUser.id!);

    // АВТОМАТИЧЕСКАЯ ГЕНЕРАЦИЯ ПРОГРАММЫ (исправлено)
    await this.workoutService.generateBaseProgram(savedUser.id!);

    return { user: savedUser, token };
  }

  // ... (остальные методы без изменений: login, generateToken, verifyToken)
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Неверный email или пароль');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Неверный email или пароль');
    }

    const token = this.generateToken(user.id!);
    return { user, token };
  }

  private generateToken(userId: number): string {
    const secret = process.env.JWT_SECRET || 'fitmaster-secret-key';
    return jwt.sign({ userId }, secret, { expiresIn: '7d' });
  }

  verifyToken(token: string): { userId: number } {
    const secret = process.env.JWT_SECRET || 'fitmaster-secret-key';
    return jwt.verify(token, secret) as { userId: number };
  }
}