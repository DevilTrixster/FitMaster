import { AppError } from './AppError';

export class ValidationError extends AppError {
  constructor(message: string = 'Validation error') {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Внутренняя ошибка сервера') {
    super(message, 500);
    this.name = 'InternalServerError';
  }
}