// Данные одного выполненного подхода для анализа и адаптации
export interface SetAnalysisData {
  completed: boolean;    // Подход выполнен (не пропущен)
  skipped: boolean;      // Подход пропущен
  reps?: number;         // Фактическое количество повторений
  weight?: number;       // Фактический вес (или 0 для упражнений с собственным весом)
  targetReps?: number;   // Целевое количество повторений
  targetWeight?: number; // Целевой вес
}