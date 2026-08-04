import { Request, Response, NextFunction } from 'express';
import { ProfileService } from '../../application/services/profile/ProfileService';
import { validateTimeFormat } from '../../core/utils/validators';
import { UnauthorizedError, ValidationError } from '../../core/errors/ValidationError';
import { ExperienceLevel, FitnessGoal } from '../../domain/entities/User';

export class ProfileController {
  constructor(private profileService: ProfileService) {}

  // Возвращает полный профиль пользователя (включая уровень и цель).
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const user = await this.profileService.getProfile(userId);
    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }
    const preferredDays = await this.profileService.getPreferredDays(userId);
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
      avatarUrl: (user as any).avatar_url || null,
      preferredDays,
      experienceLevel: user.experienceLevel,
      fitnessGoal: user.fitnessGoal,
    });
  }

  /**
   * Обновление профиля.
   * Принимает nickname, firstName, lastName, height, weight,
   * preferredWorkoutTime, experienceLevel, fitnessGoal.
   */
  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    if (!userId) throw new UnauthorizedError('Не авторизован');

    const {
      nickname,
      firstName,
      lastName,
      height,
      weight,
      preferredWorkoutTime,
      experienceLevel,
      fitnessGoal,
    } = req.body;

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
      experienceLevel: experienceLevel as ExperienceLevel,
      fitnessGoal: fitnessGoal as FitnessGoal,
    });

    // Если изменилось время – синхронизируем будущие тренировки
    if (preferredWorkoutTime) {
      await this.profileService.updateFutureWorkoutsTime(userId, preferredWorkoutTime);
    }

    res.json({ message: 'Профиль обновлён' });
  }

  // Получение предпочтительных дней тренировок (массив чисел 1..7).
  async getPreferredDays(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const days = await this.profileService.getPreferredDays(userId);
    res.json({ days });
  }

  // Загрузка аватара (multipart/form-data, поле avatar). 
  async uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;

    if (!req.file) {
      res.status(400).json({ error: 'Файл не загружен' });
      return;
    }
    try {
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      await this.profileService.updateAvatar(userId, avatarUrl);
      res.json({ avatarUrl });
    } catch (error: any) {
      console.error('❌ Avatar upload error:', error);
      res.status(500).json({ error: 'Не удалось сохранить аватар: ' + error.message });
    }
  }

  // Обновление предпочтительных дней тренировок (от 1 до 3 дней). 
  async updatePreferredDays(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const { days } = req.body;
    console.log('🔁 ProfileController.updatePreferredDays received:', { userId, days });
    if (!Array.isArray(days) || days.length < 1 || days.length > 3) {
      throw new ValidationError('Выберите от 1 до 3 дней недели');
    }
    const valid = days.every(d => Number.isInteger(d) && d >= 1 && d <= 7);
    if (!valid) throw new ValidationError('Некорректные дни');
    await this.profileService.updatePreferredDays(userId, days);
    res.json({ message: 'Дни тренировок обновлены' });
  }
}