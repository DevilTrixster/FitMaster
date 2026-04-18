import { ExerciseProgressDTO, MuscleGroupStatsDTO } from '../../application/dto/ProgressStatsDTO';

export interface IProgressRepository {
  getExerciseProgress(userId: number, exerciseId: number, limit?: number): Promise<ExerciseProgressDTO | null>;
  getMuscleGroupStats(userId: number): Promise<MuscleGroupStatsDTO[]>;
}