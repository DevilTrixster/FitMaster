import { Database } from '../../injection/database';
import { IExerciseSubstitutionRepository } from '../../domain/interfaces/IExerciseSubstitutionRepository';

export class ExerciseSubstitutionRepository implements IExerciseSubstitutionRepository {
  constructor(private database: Database) {}

  async getSubstitution(exerciseId: number): Promise<{ substituteId: number; priority: number } | null> {
    const res = await this.database.query(
      `SELECT substitute_exercise_id, priority FROM exercise_substitutions
       WHERE exercise_id = $1 ORDER BY priority LIMIT 1`,
      [exerciseId]
    );
    if (res.rows.length === 0) return null;
    return {
      substituteId: res.rows[0].substitute_exercise_id,
      priority: res.rows[0].priority,
    };
  }
}