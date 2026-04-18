import { ValidationError } from '../errors/ValidationError';

export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

export function isValidTime(timeString: string): boolean {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(timeString);
}

export function validateRescheduleDate(newDate: string, currentDate: Date): void {
  if (!isValidDate(newDate)) {
    throw new ValidationError('Неверный формат даты. Используйте YYYY-MM-DD');
  }

  const targetDate = new Date(newDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (targetDate < today) {
    throw new ValidationError('Нельзя перенести тренировку на прошедшую дату');
  }
}

export function validateTime(timeString: string | undefined): void {
  if (timeString && !isValidTime(timeString)) {
    throw new ValidationError('Неверный формат времени. Используйте HH:MM');
  }
}