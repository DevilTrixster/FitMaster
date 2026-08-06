import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../application/services/auth/AuthService';
import { Gender, ExperienceLevel, FitnessGoal } from '../../domain/entities/User';
import { allvalidators } from '../../core/utils/validators';

export class AuthController {
  constructor(private authService: AuthService) {}

  // Регистрация нового пользователя
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    const {
      nickname,
      password,
      email,
      firstName,
      lastName,
      birthDate,
      gender,
      height,
      weight,
      experienceLevel,
      fitnessGoal,
    } = req.body;

    // Валидация обязательных полей
    allvalidators.validateRequired(nickname, 'nickname');
    allvalidators.validateRequired(password, 'password');
    allvalidators.validateRequired(email, 'email');
    allvalidators.validateRequired(firstName, 'firstName');
    allvalidators.validateRequired(lastName, 'lastName');
    allvalidators.validateRequired(birthDate, 'birthDate');
    allvalidators.validateRequired(gender, 'gender');
    allvalidators.validateRequired(height, 'height');
    allvalidators.validateRequired(weight, 'weight');

    allvalidators.validateEmailFormat(email);
    allvalidators.validatePasswordStrength(password);

    const result = await this.authService.register({
      nickname,
      password,
      email,
      firstName,
      lastName,
      birthDate: new Date(birthDate),
      gender: gender as Gender,
      height: Number(height),
      weight: Number(weight),
      experienceLevel: experienceLevel as ExperienceLevel,
      fitnessGoal: fitnessGoal as FitnessGoal,
    });

    res.status(201).json({
      message: 'Регистрация успешна',
      user: {
        id: result.user.id,
        nickname: result.user.nickname,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
      token: result.token,
    });
  }

  // Авторизация пользователя: email + password → JWT.
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.body) {
      res.status(400).json({ error: 'Тело запроса пустое' });
      return;
    }

    const { email, password } = req.body;
    allvalidators.validateRequired(email, 'email');
    allvalidators.validateRequired(password, 'password');

    const result = await this.authService.login(email, password);
    res.status(200).json({
      message: 'Вход успешен',
      user: {
        id: result.user.id,
        nickname: result.user.nickname,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
      token: result.token,
    });
  }
}