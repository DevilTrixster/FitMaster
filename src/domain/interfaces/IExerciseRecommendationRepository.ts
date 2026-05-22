export interface IExerciseRecommendation {
  id?: number;
  userId: number;
  exerciseId: number;
  suggestedExerciseId: number;
  reason: string;
  isActive: boolean;
  createdAt: Date;
  appliedAt?: Date;
}

export interface IExerciseRecommendationRepository {
  createRecommendation(recommendation: IExerciseRecommendation): Promise<void>;
  getActiveRecommendations(userId: number): Promise<IExerciseRecommendation[]>;
  markApplied(id: number): Promise<void>;
}