export interface ExerciseTrendPoint {
  date: string;           // YYYY-MM-DD
  avgWeight: number;      // Средний вес за тренировку
  totalVolume: number;    // Вес × Повторения × Подходы
  maxReps: number;        // Лучший результат за сессию
}

export interface ExerciseProgressDTO {
  exerciseId: number;
  exerciseName: string;
  muscleGroup: string;
  trend: ExerciseTrendPoint[];
}

export interface MuscleGroupStatsDTO {
  muscleGroup: string;
  totalWorkouts: number;
  totalVolume: number;
  avgWellnessRating: number; // Средняя оценка самочувствия
}