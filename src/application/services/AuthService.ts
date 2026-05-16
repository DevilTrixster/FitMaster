import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ConflictError, UnauthorizedError } from '../../core/errors/ValidationError';
import { User, Gender, ExperienceLevel, FitnessGoal } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { WorkoutService } from './WorkoutService';
import { InitialTargetsService } from './adaptation/IntelligentAdaptationService';

export class AuthService {
  constructor(
    private userRepository: IUserRepository,
    private workoutService: WorkoutService,
    private initialTargetsService: InitialTargetsService
  ) {}

  /**
   * Регистрация нового пользователя.
   * - Проверяет уникальность email и nickname.
   * - Хеширует пароль.
   * - Создаёт пользователя в БД.
   * - Генерирует JWT.
   * - Создаёт базовую программу тренировок.
   * - Инициализирует начальные цели упражнений на основе выбранного уровня.
   */
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
    experienceLevel?: ExperienceLevel;
    fitnessGoal?: FitnessGoal;
  }): Promise<{ user: User; token: string }> {
    const existingByEmail = await this.userRepository.findByEmail(data.email);
    if (existingByEmail) throw new ConflictError('Пользователь с таким email уже существует');

    const existingByNickname = await this.userRepository.findByNickname(data.nickname);
    if (existingByNickname) throw new ConflictError('Пользователь с таким никнеймом уже существует');

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);
    const user = new User({
      ...data,
      password: hashedPassword,
      experienceLevel: data.experienceLevel || ExperienceLevel.Novice,
      fitnessGoal: data.fitnessGoal || FitnessGoal.Maintenance,
    });
    const savedUser = await this.userRepository.createUser(user);
    const token = this.generateToken(savedUser.id!);

    // Генерация базовой программы на 4 недели
    await this.workoutService.generateBaseProgram(savedUser.id!);
    // Установка начального веса/повторений по уровню
    await this.initialTargetsService.initializeTargets(savedUser.id!);

    return { user: savedUser, token };
  }

  // Аутентификация пользователя по email и паролю.
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new UnauthorizedError('Неверный email или пароль');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedError('Неверный email или пароль');

    const token = this.generateToken(user.id!);
    return { user, token };
  }

  // Генерация JWT токена (срок жизни 7 дней).
  private generateToken(userId: number): string {
    const secret = process.env.JWT_SECRET || 'fitmaster-secret-key';
    return jwt.sign({ userId }, secret, { expiresIn: '7d' });
  }

  // Верификация JWT токена, возвращает userId.
  verifyToken(token: string): { userId: number } {
    const secret = process.env.JWT_SECRET || 'fitmaster-secret-key';
    return jwt.verify(token, secret) as { userId: number };
  }
}