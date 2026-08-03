import { Database } from '../../injection/database';
import { IExerciseLikeRepository } from '../../domain/interfaces/IExerciseLikeRepository';

export class ExerciseLikeRepository implements IExerciseLikeRepository {
  constructor(private database: Database) {}

  async setLike(userId: number, exerciseId: number, liked: boolean): Promise<void> {
    const query = `
      INSERT INTO exercise_likes (user_id, exercise_id, liked, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, exercise_id)
      DO UPDATE SET liked = EXCLUDED.liked, updated_at = EXCLUDED.updated_at
    `;
    await this.database.query(query, [userId, exerciseId, liked]);
  }

  async getLikes(userId: number, exerciseIds?: number[]): Promise<Map<number, boolean>> {
    let query = `SELECT exercise_id, liked FROM exercise_likes WHERE user_id = $1`;
    const params: any[] = [userId];
    if (exerciseIds && exerciseIds.length) {
      query += ` AND exercise_id = ANY($2)`;
      params.push(exerciseIds);
    }
    const res = await this.database.query(query, params);
    const map = new Map<number, boolean>();
    res.rows.forEach(row => map.set(row.exercise_id, row.liked));
    return map;
  }
}