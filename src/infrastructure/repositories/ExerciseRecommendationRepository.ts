import { Pool } from 'pg';
import { IExerciseRecommendationRepository, IExerciseRecommendation } from '../../domain/interfaces/IExerciseRecommendationRepository';

export class ExerciseRecommendationRepository implements IExerciseRecommendationRepository {
  constructor(private pool: Pool) {}

  async createRecommendation(recommendation: IExerciseRecommendation): Promise<void> {
    await this.pool.query(
      `INSERT INTO exercise_recommendations (user_id, exercise_id, suggested_exercise_id, reason)
       VALUES ($1, $2, $3, $4)`,
      [recommendation.userId, recommendation.exerciseId, recommendation.suggestedExerciseId, recommendation.reason]
    );
  }

  async getActiveRecommendations(userId: number): Promise<IExerciseRecommendation[]> {
    const res = await this.pool.query(
      `SELECT * FROM exercise_recommendations WHERE user_id = $1 AND is_active = TRUE ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      exerciseId: row.exercise_id,
      suggestedExerciseId: row.suggested_exercise_id,
      reason: row.reason,
      isActive: row.is_active,
      createdAt: row.created_at,
      appliedAt: row.applied_at,
    }));
  }

  async markApplied(id: number): Promise<void> {
    await this.pool.query(
      `UPDATE exercise_recommendations SET is_active = FALSE, applied_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
  }
}