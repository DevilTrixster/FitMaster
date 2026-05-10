import { Pool } from 'pg';
import { WorkoutAdaptation, AdaptationType } from '../../../domain/entities/Workout';

export class AdaptationRepository {
  constructor(private pool: Pool) {}

  async saveAdaptation(adaptation: WorkoutAdaptation): Promise<void> {
    const query = `
      INSERT INTO workout_adaptations 
      (user_id, user_workout_id, exercise_id, previous_weight, new_weight, previous_reps, new_reps, adaptation_reason)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    await this.pool.query(query, [
      adaptation.userId, adaptation.id, adaptation.exerciseId,
      adaptation.previousWeight, adaptation.newWeight,
      adaptation.previousReps, adaptation.newReps,
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
      previousWeight: row.previous_weight,
      newWeight: row.new_weight,
      previousReps: row.previous_reps,
      newReps: row.new_reps,
      adaptationType: row.adaptation_reason.includes('увелич') ? AdaptationType.IncreaseWeight : AdaptationType.DecreaseWeight,
      reason: row.adaptation_reason,
    }));
  }

  async saveExerciseSubstitution(userId: number, originalExerciseId: number, alternativeExerciseId: number, reason: string): Promise<void> {
    const query = `
      INSERT INTO workout_adaptations 
      (user_id, exercise_id, previous_weight, new_weight, adaptation_reason, created_at)
      VALUES ($1, $2, NULL, NULL, $3, CURRENT_TIMESTAMP)
    `;
    const fullReason = `SUBSTITUTION:${originalExerciseId}->${alternativeExerciseId}:${reason}`;
    await this.pool.query(query, [userId, alternativeExerciseId, fullReason]);
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
      previousWeight: row.previous_weight,
      newWeight: row.new_weight,
      previousReps: row.previous_reps,
      newReps: row.new_reps,
      adaptationType: row.adaptation_reason.includes('увелич') ? AdaptationType.IncreaseWeight : AdaptationType.DecreaseWeight,
      reason: row.adaptation_reason,
    });
  }

  async getUserExerciseSubstitutions(userId: number): Promise<{
    originalExerciseId: number;
    alternativeExerciseId: number;
    reason: string;
    suggestedAt: Date;
  }[]> {
    const result = await this.pool.query(
      `SELECT exercise_id as alternative_exercise_id, adaptation_reason, created_at
      FROM workout_adaptations
      WHERE user_id = $1 AND adaptation_reason LIKE 'SUBSTITUTION:%'
      ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows.map((row: any) => {
      const match = row.adaptation_reason.match(/SUBSTITUTION:(\d+)->(\d+):(.+)/);
      return {
        originalExerciseId: parseInt(match[1]),
        alternativeExerciseId: row.alternative_exercise_id,
        reason: match[3],
        suggestedAt: new Date(row.created_at),
      };
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
      previousWeight: row.previous_weight,
      newWeight: row.new_weight,
      previousReps: row.previous_reps,
      newReps: row.new_reps,
      adaptationType: row.adaptation_type,
      reason: row.adaptation_reason,
    }));
  }
}