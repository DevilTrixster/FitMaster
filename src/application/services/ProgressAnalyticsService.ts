import { IProgressRepository } from '../../domain/interfaces/IProgressRepository';
import { ExerciseProgressDTO, MuscleGroupStatsDTO } from '../dto/ProgressStatsDTO';
import { NotFoundError } from '../../core/errors/ValidationError';

export class ProgressAnalyticsService {
  constructor(private progressRepo: IProgressRepository) {}

  async getExerciseProgress(userId: number, exerciseId: number, limit?: number): Promise<ExerciseProgressDTO> {
    const data = await this.progressRepo.getExerciseProgress(userId, exerciseId, limit);
    if (!data) {
      throw new NotFoundError('Нет данных по этому упражнению');
    }
    return data;
  }

  async getMuscleGroupStats(userId: number): Promise<MuscleGroupStatsDTO[]> {
    return await this.progressRepo.getMuscleGroupStats(userId);
  }
}