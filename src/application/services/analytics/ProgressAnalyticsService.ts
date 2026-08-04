import { IProgressRepository } from '../../../domain/interfaces/IProgressRepository';
import { ExerciseProgressDTO, MuscleGroupStatsDTO } from '../../dto/ProgressStatsDTO';

export class ProgressAnalyticsService {
  constructor(private progressRepo: IProgressRepository) {}

  // Прогресс конкретного упражнения
  async getExerciseProgress(userId: number, exerciseId: number, limit?: number): Promise<ExerciseProgressDTO | null> {
    return await this.progressRepo.getExerciseProgress(userId, exerciseId, limit);
  }

  // Статистика по группам мышц
  async getMuscleGroupStats(userId: number): Promise<MuscleGroupStatsDTO[]> {
    return await this.progressRepo.getMuscleGroupStats(userId);
  }

  // Данные о воспринимаемой нагрузке (RPE)
  async getRPEData(userId: number) {
    return await this.progressRepo.getRPEData(userId);
  }

  async getExerciseRawSets(userId: number, exerciseId: number) {
    return this.progressRepo.getExerciseRawSets(userId, exerciseId);
  }

  async getMuscleBalanceRadar(userId: number) {
    return this.progressRepo.getMuscleBalanceRadar(userId);
  }
}