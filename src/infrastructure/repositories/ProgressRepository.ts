import { Pool } from 'pg';
import { IProgressRepository } from '../../domain/interfaces/IProgressRepository';
import { ExerciseProgressDTO, MuscleGroupStatsDTO } from '../../application/dto/ProgressStatsDTO';

export class ProgressRepository implements IProgressRepository {
  constructor(private pool: Pool) {}

  async getExerciseProgress(userId: number, exerciseId: number, limit: number = 30): Promise<ExerciseProgressDTO | null> {
    const query = `
      SELECT 
        e.id as exercise_id,
        e.name as exercise_name,
        e.muscle_group,
        uw.scheduled_date as date,
        COALESCE(AVG(wr.actual_weight), 0) as avg_weight,
        COALESCE(SUM(wr.actual_weight * wr.actual_reps), 0) as total_volume,
        COALESCE(MAX(wr.actual_reps), 0) as max_reps
      FROM workout_results wr
      JOIN user_workouts uw ON wr.user_workout_id = uw.id
      JOIN exercises e ON wr.exercise_id = e.id
      WHERE uw.user_id = $1 
        AND wr.exercise_id = $2 
        AND wr.completed = true
      GROUP BY e.id, e.name, e.muscle_group, uw.scheduled_date
      ORDER BY uw.scheduled_date ASC
      LIMIT $3
    `;
    
    const result = await this.pool.query(query, [userId, exerciseId, limit]);
    
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      exerciseId: row.exercise_id,
      exerciseName: row.exercise_name,
      muscleGroup: row.muscle_group,
      trend: result.rows.map((r: any) => ({
        date: r.date.toISOString().split('T')[0],
        avgWeight: parseFloat(r.avg_weight),
        totalVolume: parseFloat(r.total_volume),
        maxReps: parseInt(r.max_reps),
      })),
    };
  }

  async getMuscleGroupStats(userId: number): Promise<MuscleGroupStatsDTO[]> {
    const query = `
      SELECT 
        e.muscle_group,
        COUNT(DISTINCT uw.id) as total_workouts,
        COALESCE(SUM(wr.actual_weight * wr.actual_reps), 0) as total_volume,
        COALESCE(AVG(uw.wellness_rating), 0) as avg_wellness_rating
      FROM user_workouts uw
      JOIN workout_results wr ON uw.id = wr.user_workout_id
      JOIN exercises e ON wr.exercise_id = e.id
      WHERE uw.user_id = $1 AND uw.status = 'completed'
      GROUP BY e.muscle_group
      ORDER BY total_volume DESC
    `;
    
    const result = await this.pool.query(query, [userId]);
    
    return result.rows.map((row: any) => ({
      muscleGroup: row.muscle_group,
      totalWorkouts: parseInt(row.total_workouts),
      totalVolume: parseFloat(row.total_volume),
      avgWellnessRating: parseFloat(row.avg_wellness_rating),
    }));
  }
}