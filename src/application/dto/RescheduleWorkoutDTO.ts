export interface RescheduleWorkoutDTO {
  newDate: string;      // YYYY-MM-DD
  newTime?: string;     // HH:MM (опционально)
  reason?: string;      // причина переноса
}