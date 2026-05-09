import { Request, Response, NextFunction } from 'express';
import { ProfileService } from '../../application/services/ProfileService';
import { validateTimeFormat } from '../../core/utils/validators';
import { UnauthorizedError } from '../../core/errors/ValidationError';

export class ProfileController {
  constructor(private profileService: ProfileService) {}

  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const user = await this.profileService.getProfile(userId);

    if (!user) {
      // Отправляем 404, но не через Error, потому что это не исключительная ситуация
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    res.json({
      id: user.id,
      nickname: user.nickname,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      height: user.height,
      weight: user.weight,
      gender: user.gender,
      birthDate: user.birthDate,
      preferredWorkoutTime: user.preferredWorkoutTime,
    });
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;

    if (!userId) {
      throw new UnauthorizedError('Не авторизован');
    }

    const {
      nickname,
      firstName,
      lastName,
      height,
      weight,
      preferredWorkoutTime,
    } = req.body;

    // Валидация времени (если передано)
    if (preferredWorkoutTime !== undefined) {
      validateTimeFormat(preferredWorkoutTime);
    }

    await this.profileService.updateProfile(userId, {
      nickname,
      firstName,
      lastName,
      height,
      weight,
      preferredWorkoutTime,
    });

    if (preferredWorkoutTime) {
      await this.profileService.updateFutureWorkoutsTime(userId, preferredWorkoutTime);
    }

    res.json({ message: 'Профиль обновлён' });
  }
}