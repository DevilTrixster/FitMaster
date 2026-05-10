// Точка графика прогресса упражнения
export interface ExerciseTrendPoint {
  date: string;           // YYYY-MM-DD
  avgWeight: number;      // Средний вес за тренировку
  totalVolume: number;    // Вес × Повторения × Подходы
  maxReps: number;        // Лучший результат повторений за тренировку
}

// Прогресс конкретного упражнения
export interface ExerciseProgressDTO {
  exerciseId: number;
  exerciseName: string;
  muscleGroup: string;
  trend: ExerciseTrendPoint[];   // Массив точек для графика
}

// Статистика по группе мышц
export interface MuscleGroupStatsDTO {
  muscleGroup: string;
  totalWorkouts: number;         // Количество завершённых тренировок с этой группой
  totalVolume: number;           // Суммарный тоннаж (кг × повторения)
  avgWellnessRating: number;     // Средняя оценка самочувствия
}