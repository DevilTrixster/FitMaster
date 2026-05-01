import { IProgressRepository } from '../../domain/interfaces/IProgressRepository';
import { ExerciseProgressDTO, MuscleGroupStatsDTO } from '../dto/ProgressStatsDTO';

export class ProgressAnalyticsService {
  constructor(private progressRepo: IProgressRepository) {}

  async getExerciseProgress(userId: number, exerciseId: number, limit?: number): Promise<ExerciseProgressDTO | null> {
    const data = await this.progressRepo.getExerciseProgress(userId, exerciseId, limit);
    return data;
  }

  async getMuscleGroupStats(userId: number): Promise<MuscleGroupStatsDTO[]> {
    return await this.progressRepo.getMuscleGroupStats(userId);
  }

  async getRPEData(userId: number) {
    return await this.progressRepo.getRPEData(userId);
  }
}