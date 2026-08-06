import { AppError } from './AppError';

export class ValidationError extends AppError {
  constructor(message: string = 'Некорректные входные данные (Validation error)') {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Пользователь не авторизован (Unauthorized)') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Доступ запрещён (Resource conflict)') {
    super(message, 403);
    this.name = 'ConflictError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Запрашиваемый ресурс не найден (Resource not found)') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Внутренняя ошибка сервера') {
    super(message, 500);
    this.name = 'InternalServerError';
  }
}