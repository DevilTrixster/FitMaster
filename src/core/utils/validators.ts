import { ValidationError } from '../errors/ValidationError';

export function validateRequired(value: any, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`Поле "${fieldName}" обязательно для заполнения`);
  }
}

export function validateEmailFormat(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Некорректный формат email');
  }
}

export function validatePasswordStrength(password: string): void {
  if (password.length < 6) {
    throw new ValidationError('Пароль должен содержать минимум 6 символов');
  }
}

export function validateDateInFuture(date: Date, fieldName: string): void {
  if (isNaN(date.getTime())) {
    throw new ValidationError(`Поле "${fieldName}" должно быть корректной датой`);
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) {
    throw new ValidationError(`Дата "${fieldName}" не может быть в прошлом`);
  }
}

export function validateTimeFormat(time: string): void {
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (time && !timeRegex.test(time)) {
    throw new ValidationError('Неверный формат времени. Используйте ЧЧ:ММ');
  }
}

// Существующая функция, оставлена для обратной совместимости
export function validateRescheduleDate(newDate: string, currentDate: Date) {
  const parsed = new Date(newDate);
  if (isNaN(parsed.getTime())) {
    throw new ValidationError('Некорректная дата переноса');
  }
  const today = new Date(currentDate);
  today.setHours(0, 0, 0, 0);
  if (parsed < today) {
    throw new ValidationError('Нельзя перенести тренировку на прошедшую дату');
  }
}

// Единый вызов всех валидаторов
export const allvalidators = {
  validateRequired,
  validateEmailFormat,
  validatePasswordStrength,
  validateDateInFuture,
  validateTimeFormat,
  validateRescheduleDate
};