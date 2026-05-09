import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../core/errors/AppError';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Если ошибка — экземпляр AppError, используем её статус-код
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
    });
    return;
  }

  // Для неопознанных ошибок логируем подробности и возвращаем 500
  console.error('💥 Unexpected error:', err);
  res.status(500).json({
    error: 'Внутренняя ошибка сервера',
  });
}