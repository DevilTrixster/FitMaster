import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../application/services/AuthService';

export function createAuthMiddleware(authService: AuthService) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Требуется авторизация' });
        return;
      }

      const token = authHeader.split(' ')[1];
      const payload = authService.verifyToken(token);

      // Добавляем userId в запрос для дальнейшего использования
      (req as any).userId = payload.userId;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Неверный токен' });
    }
  };
}