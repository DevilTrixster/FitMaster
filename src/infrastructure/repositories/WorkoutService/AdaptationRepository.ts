import { Pool } from 'pg';
import { WorkoutAdaptation, AdaptationType } from '../../../domain/entities';

export class AdaptationRepository {
  constructor(private pool: Pool) {}

  async saveAdaptation(
    adaptation: WorkoutAdaptation,
    userWorkoutId?: number
  ): Promise<void> {
    const query = `
      INSERT INTO workout_adaptations 
      (user_id, user_workout_id, exercise_id, previous_weight, new_weight, previous_reps, new_reps, adaptation_reason)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    await this.pool.query(query, [
      adaptation.userId,
      userWorkoutId || null,
      adaptation.exerciseId,
      adaptation.previousWeight,
      adaptation.newWeight,
      adaptation.previousReps,
      adaptation.newReps,
      adaptation.reason,
    ]);
  }

  async getUserAdaptations(userId: number, exerciseId: number, limit: number = 10): Promise<WorkoutAdaptation[]> {
    const result = await this.pool.query(
      `SELECT * FROM workout_adaptations WHERE user_id = $1 AND exercise_id = $2 ORDER BY created_at DESC LIMIT $3`,
      [userId, exerciseId, limit]
    );
    return result.rows.map((row: any) => new WorkoutAdaptation({
      id: row.id,
      userId: row.user_id,
      exerciseId: row.exercise_id,
      userWorkoutId: row.user_workout_id,
      previousWeight: row.previous_weight,
      newWeight: row.new_weight,
      previousReps: row.previous_reps,
      newReps: row.new_reps,
      adaptationType: row.adaptation_reason.includes('увелич') ? AdaptationType.IncreaseWeight : AdaptationType.DecreaseWeight,
      reason: row.adaptation_reason,
    }));
  }

  async getLatestAdaptation(userId: number, exerciseId: number): Promise<WorkoutAdaptation | null> {
    const query = `
      SELECT * FROM workout_adaptations
      WHERE user_id = $1 AND exercise_id = $2
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const res = await this.pool.query(query, [userId, exerciseId]);
    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    return new WorkoutAdaptation({
      id: row.id,
      userId: row.user_id,
      exerciseId: row.exercise_id,
      userWorkoutId: row.user_workout_id,
      previousWeight: row.previous_weight,
      newWeight: row.new_weight,
      previousReps: row.previous_reps,
      newReps: row.new_reps,
      adaptationType: row.adaptation_reason.includes('увелич') ? AdaptationType.IncreaseWeight : AdaptationType.DecreaseWeight,
      reason: row.adaptation_reason,
    });
  }

  async getAllUserAdaptations(userId: number, limit: number = 20): Promise<WorkoutAdaptation[]> {
    const result = await this.pool.query(
      `SELECT * FROM workout_adaptations WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
    return result.rows.map((row: any) => new WorkoutAdaptation({
      id: row.id,
      userId: row.user_id,
      exerciseId: row.exercise_id,
      userWorkoutId: row.user_workout_id,
      previousWeight: row.previous_weight,
      newWeight: row.new_weight,
      previousReps: row.previous_reps,
      newReps: row.new_reps,
      adaptationType: row.adaptation_type,
      reason: row.adaptation_reason,
    }));
  }
}