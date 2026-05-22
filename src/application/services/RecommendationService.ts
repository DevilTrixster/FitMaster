import { IExerciseRecommendationRepository } from '../../domain/interfaces/IExerciseRecommendationRepository';
import { IDeloadRepository } from '../../domain/interfaces/IDeloadRepository';
import { IWorkoutRepository } from '../../domain/interfaces/IWorkoutRepository';

export class RecommendationService {
  constructor(
    private recommendationRepo: IExerciseRecommendationRepository,
    private deloadRepo: IDeloadRepository,
    private workoutRepo: IWorkoutRepository
  ) {}

  async getUserRecommendations(userId: number) {
    const activeRecommendations = await this.recommendationRepo.getActiveRecommendations(userId);
    const deload = await this.deloadRepo.getActiveDeload(userId);

    // Получить последние адаптации для всех упражнений (уникальные)
    const adaptations = await this.workoutRepo.getAllUserAdaptations(userId, 100);
    const nextTargetsMap = new Map<number, { weight: number; reps: number }>();
    for (const a of adaptations) {
      if (!nextTargetsMap.has(a.exerciseId)) {
        nextTargetsMap.set(a.exerciseId, { weight: a.newWeight, reps: a.newReps });
      }
    }
    const nextTargets = Array.from(nextTargetsMap.entries()).map(([exerciseId, targets]) => ({
      exerciseId,
      newWeight: targets.weight,
      newReps: targets.reps,
    }));

    return {
      deloadActive: !!deload,
      deloadFactor: deload?.intensityFactor || 1,
      recommendations: activeRecommendations.map(r => ({
        exerciseId: r.exerciseId,
        suggestedExerciseId: r.suggestedExerciseId,
        reason: r.reason,
      })),
      nextTargets,
    };
  }
}