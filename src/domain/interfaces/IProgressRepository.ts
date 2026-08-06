import { ExerciseProgressDTO, MuscleGroupStatsDTO } from '../../application/dto/ProgressStatsDTO';

// Репозиторий прогресса
export interface IProgressRepository {
  getExerciseProgress(userId: number, exerciseId: number, limit?: number): Promise<ExerciseProgressDTO | null>;
  getMuscleGroupStats(userId: number): Promise<MuscleGroupStatsDTO[]>;
  getRPEData(userId: number): Promise<any[]>;
  getExerciseRawSets(userId: number, exerciseId: number): Promise<{ weight: number; reps: number }[]>;
  getMuscleBalanceRadar(userId: number): Promise<{ muscle: string; volume: number }[]>;
}