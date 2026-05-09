import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../application/services/AuthService';
import { Gender } from '../../domain/entities/User';
import {
  validateRequired,
  validateEmailFormat,
  validatePasswordStrength,
} from '../../core/utils/validators';

export class AuthController {
  constructor(private authService: AuthService) {}

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
    } = req.body;

    // Валидация – каждая функция бросит ValidationError при проблеме
    validateRequired(nickname, 'nickname');
    validateRequired(password, 'password');
    validateRequired(email, 'email');
    validateRequired(firstName, 'firstName');
    validateRequired(lastName, 'lastName');
    validateRequired(birthDate, 'birthDate');
    validateRequired(gender, 'gender');
    validateRequired(height, 'height');
    validateRequired(weight, 'weight');

    validateEmailFormat(email);
    validatePasswordStrength(password);

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

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Проверяем, что body получен
    if (!req.body) {
      res.status(400).json({ error: 'Тело запроса пустое' });
      return;
    }

    const { email, password } = req.body;

    validateRequired(email, 'email');
    validateRequired(password, 'password');

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