import { IWorkoutRepository } from '../../../domain/interfaces/IWorkoutRepository';
import { IExerciseSubstitutionRepository } from '../../../domain/interfaces/IExerciseSubstitutionRepository';
import { IExerciseRecommendationRepository } from '../../../domain/interfaces/IExerciseRecommendationRepository';
import { ExerciseLikeService } from '../ExerciseLikeService';
import { WorkoutAdaptation, AdaptationType } from '../../../domain/entities';

export class PlateauDetectionService {
  constructor(
    private workoutRepo: IWorkoutRepository,
    private substitutionRepo: IExerciseSubstitutionRepository,
    private recommendationRepo: IExerciseRecommendationRepository,
    private likeService: ExerciseLikeService
  ) {}

   //Проверяет, находится ли упражнение в застое (застоем считаются 4 последние адаптации без прогресса)
  async isPlateau(userId: number, exerciseId: number): Promise<boolean> {
    const adaptations = await this.workoutRepo.getUserAdaptations(userId, exerciseId, 6);
    if (adaptations.length < 4) return false;

    const recent = adaptations.slice(0, 4);
    return recent.every(
      a => a.adaptationType === AdaptationType.NoChange || a.adaptationType === AdaptationType.DecreaseWeight
    );
  }

  async suggestSubstitution(userId: number, exerciseId: number): Promise<number | null> {
    
    // Проверяем, есть ли активная рекомендация для этого упражнения
    const activeRecs = await this.recommendationRepo.getActiveRecommendations(userId);
    const existing = activeRecs.find(r => r.exerciseId === exerciseId);
    if (existing) return existing.suggestedExerciseId;

    // Ищем замену из таблицы substitutions
    const sub = await this.substitutionRepo.getSubstitution(exerciseId);
    if (!sub) return null;

    // Проверяем, не дизлайкнул ли пользователь предлагаемое упражнение
    const disliked = await this.likeService.getDislikedExercises(userId);
    if (disliked.includes(sub.substituteId)) return null;

    // Сохраняем рекомендацию
    await this.recommendationRepo.createRecommendation({
      userId,
      exerciseId,
      suggestedExerciseId: sub.substituteId,
      reason: 'plateau_detected',
      isActive: true,
      createdAt: new Date(),
    });
    return sub.substituteId;
  }
}