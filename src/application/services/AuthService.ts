import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, Gender } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { IWorkoutRepository } from '../../domain/interfaces/IWorkoutRepository';
import { WorkoutService } from './WorkoutService';

export class AuthService {
  constructor(
    private userRepository: IUserRepository,
    private workoutRepository: IWorkoutRepository
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
    
    // Проверка на существующего пользователя
    const existingByEmail = await this.userRepository.findByEmail(data.email);
    if (existingByEmail) {
      throw new Error('Пользователь с таким email уже существует');
    }

    const existingByNickname = await this.userRepository.findByNickname(data.nickname);
    if (existingByNickname) {
      throw new Error('Пользователь с таким никнеймом уже существует');
    }

    // Хеширование пароля (безопасность!)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);

    // Создание сущности пользователя
    const user = new User({
      ...data,
      password: hashedPassword,
    });

    // Сохранение в БД через репозиторий
    const savedUser = await this.userRepository.createUser(user);

    // Генерация JWT токена
    const token = this.generateToken(savedUser.id!);

    // АВТОМАТИЧЕСКАЯ ГЕНЕРАЦИЯ ПРОГРАММЫ 
    const workoutService = new WorkoutService(this.workoutRepository, this.userRepository);
    await workoutService.generateBaseProgram(savedUser.id!);
    return { user: savedUser, token };
  }

  // Вход пользователя
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    
    // Поиск пользователя по email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Неверный email или пароль');
    }

    // Проверка пароля
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Неверный email или пароль');
    }

    // Генерация токена
    const token = this.generateToken(user.id!);

    return { user, token };
  }

  // Генерация JWT токена
  private generateToken(userId: number): string {
    const secret = process.env.JWT_SECRET || 'fitmaster-secret-key';
    return jwt.sign({ userId }, secret, { expiresIn: '7d' });
  }

  // Проверка токена (для защищённых маршрутов)
  verifyToken(token: string): { userId: number } {
    const secret = process.env.JWT_SECRET || 'fitmaster-secret-key';
    return jwt.verify(token, secret) as { userId: number };
  }
}