// Репозиторий замены упражнений
export interface IExerciseSubstitutionRepository {
  getSubstitution(exerciseId: number): Promise<{ substituteId: number; priority: number } | null>;
}