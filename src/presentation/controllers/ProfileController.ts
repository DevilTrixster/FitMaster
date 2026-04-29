import { Request, Response } from 'express';
import { ProfileService } from '../../application/services/ProfileService';

export class ProfileController {
  constructor(private profileService: ProfileService) {}

  async getProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const user = await this.profileService.getProfile(userId);
      
      if (!user) {
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
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    const userId = (req as any).userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Не авторизован' });
      return;
    }

    const {
      nickname,
      firstName,
      lastName,
      height,
      weight,
      preferredWorkoutTime
    } = req.body;

    // Валидация времени (формат HH:MM или HH:MM:SS)
    if (preferredWorkoutTime && !/^\d{2}:\d{2}(:\d{2})?$/.test(preferredWorkoutTime)) {
      res.status(400).json({ error: 'Неверный формат времени. Используйте ЧЧ:ММ' });
      return;
    }

    try {
      await this.profileService.updateProfile(userId, {
        nickname,
        firstName,
        lastName,
        height,
        weight,
        preferredWorkoutTime,
      });

      // ОБНОВЛЯЕМ ВСЕ БУДУЩИЕ ТРЕНИРОВКИ НА НОВОЕ ВРЕМЯ
      if (preferredWorkoutTime) {
        await this.profileService.updateFutureWorkoutsTime(userId, preferredWorkoutTime);
      }

      res.json({ message: 'Профиль обновлён' });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Ошибка обновления профиля' });
    }
  }
}