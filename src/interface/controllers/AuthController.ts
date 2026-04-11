// src/interface/controllers/AuthController.ts
import { Request, Response } from 'express';
import { AuthService } from '../../application/services/AuthService';
import { Gender } from '../../domain/entities/User';

export class AuthController {
  constructor(private authService: AuthService) {}

  // Обработка регистрации
  async register(req: Request, res: Response): Promise<void> {
    try {
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

      // Валидация входных данных
      if (!nickname || !password || !email || !firstName || !lastName || !birthDate || !gender || !height || !weight) {
        res.status(400).json({ error: 'Все поля обязательны для заполнения' });
        return;
      }

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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Обработка входа
  async login(req: Request, res: Response): Promise<void> {
  try {
    // ✅ Проверка что body существует
    if (!req.body) {
      res.status(400).json({ error: 'Тело запроса пустое' });
      return;
    }

    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email и пароль обязательны' });
      return;
    }

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
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
}
}