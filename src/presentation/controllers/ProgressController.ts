import { Request, Response, NextFunction } from 'express';
import { ProgressAnalyticsService } from '../../application/services/ProgressAnalyticsService';

export class ProgressController {
  constructor(private progressService: ProgressAnalyticsService) {}

  async getExerciseProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const exerciseId = parseInt(req.params.id as string);
      const limit = parseInt(req.query.limit as string) || 30;

      const data = await this.progressService.getExerciseProgress(userId, exerciseId, limit);
      
      if (!data) {
        res.json({ trend: [] }); // Возвращаем пустой массив
        return;
      }
      
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async getMuscleGroupStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const data = await this.progressService.getMuscleGroupStats(userId);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async getRPEData(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const data = await this.progressService.getRPEData(userId);
      res.json(data);
    } catch (error) {
      console.error('Error loading RPE data:', error);
      res.status(500).json({ error: 'Failed to load RPE data' });
    }
  }
}