import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../application/services/AuthService';
import { UnauthorizedError } from '../../core/errors/ValidationError';
import { FatigueRecoveryService } from '../../application/services/adaptation/FatigueRecoveryService';

export function createAuthMiddleware(
  authService: AuthService,
  fatigueService?: FatigueRecoveryService
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('Требуется авторизация');
      }
      const token = authHeader.split(' ')[1];
      const payload = authService.verifyToken(token);
      (req as any).userId = payload.userId;

      // Асинхронно обновляем метрики, не блокируя ответ
      if (fatigueService) {
        fatigueService.saveDailyMetrics(payload.userId).catch(err => {
          console.error('Failed to save daily metrics:', err);
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}