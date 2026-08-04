// Данные для переноса тренировки
export interface RescheduleWorkoutDTO {
  newDate: Date;      // Новая дата в формате YYYY-MM-DD
  //newTime?: string;     // Новое время в формате HH:MM (опционально)
  reason?: string;       // Причина переноса (опционально)
}