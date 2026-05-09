import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../application/services/AuthService';
import { UnauthorizedError } from '../../core/errors/ValidationError';

export function createAuthMiddleware(authService: AuthService) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('Требуется авторизация');
      }

      const token = authHeader.split(' ')[1];
      const payload = authService.verifyToken(token);

      (req as any).userId = payload.userId;
      next();
    } catch (error) {
      next(error);
    }
  };
}