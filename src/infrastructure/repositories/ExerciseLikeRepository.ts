import { Database } from '../../injection/database';
import { bquery } from './bquery';
import { IExerciseLikeRepository } from '../../domain/interfaces/IExerciseLikeRepository';

export class ExerciseLikeRepository implements IExerciseLikeRepository {
  constructor(private database: Database) {}

  // Поставить лайк
  async setLike(userId: number, exerciseId: number, liked: boolean): Promise<void> {
    const query = bquery.q_SetLike;
    await this.database.query(query, [userId, exerciseId, liked]);
  }

  // Получить лайк
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