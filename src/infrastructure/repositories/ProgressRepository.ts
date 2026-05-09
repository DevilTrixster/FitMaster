import { Pool } from 'pg';
import { IProgressRepository } from '../../domain/interfaces/IProgressRepository';
import { ExerciseProgressDTO, MuscleGroupStatsDTO } from '../../application/dto/ProgressStatsDTO';

export class ProgressRepository implements IProgressRepository {
  constructor(private pool: Pool) {}

  async getExerciseProgress(userId: number, exerciseId: number, limit: number = 30): Promise<ExerciseProgressDTO | null> {
    const query = `
      WITH set_data AS (
        SELECT
          uw.scheduled_date,
          es.id AS set_id,
          MAX(CASE WHEN sm.metric_type = 'reps' THEN sm.value END) AS reps,
          MAX(CASE WHEN sm.metric_type = 'weight' THEN sm.value END) AS weight
        FROM user_workouts uw
        JOIN workout_exercises we ON we.workout_id = uw.workout_id
        JOIN exercise_sets es ON es.workout_exercise_id = we.id
        JOIN set_metrics sm ON sm.exercise_set_id = es.id
        WHERE uw.user_id = $1
          AND uw.status = 'completed'
          AND we.exercise_id = $2
        GROUP BY uw.scheduled_date, es.id
      )
      SELECT
        e.name AS exercise_name,
        e.muscle_group,
        e.id AS exercise_id,
        sd.scheduled_date AS date,
        COALESCE(AVG(sd.weight), 0) AS avg_weight,
        COALESCE(SUM(sd.reps * sd.weight), 0) AS total_volume,
        COALESCE(MAX(sd.reps), 0) AS max_reps
      FROM set_data sd
      JOIN exercises e ON e.id = $2
      GROUP BY e.name, e.muscle_group, e.id, sd.scheduled_date
      ORDER BY sd.scheduled_date ASC
      LIMIT $3
    `;

    const result = await this.pool.query(query, [userId, exerciseId, limit]);
    if (result.rows.length === 0) return null;

    const firstRow = result.rows[0];
    return {
      exerciseId: firstRow.exercise_id,
      exerciseName: firstRow.exercise_name,
      muscleGroup: firstRow.muscle_group,
      trend: result.rows.map((r: any) => ({
        date: new Date(r.date).toISOString().split('T')[0],
        avgWeight: parseFloat(r.avg_weight),
        totalVolume: parseFloat(r.total_volume),
        maxReps: parseInt(r.max_reps),
      })),
    };
  }

  async getMuscleGroupStats(userId: number): Promise<MuscleGroupStatsDTO[]> {
    const query = `
      WITH set_data AS (
        SELECT
          uw.id AS workout_id,
          uw.wellness_rating,
          e.muscle_group,
          es.id AS set_id,
          MAX(CASE WHEN sm.metric_type = 'reps' THEN sm.value END) AS reps,
          MAX(CASE WHEN sm.metric_type = 'weight' THEN sm.value END) AS weight
        FROM user_workouts uw
        JOIN workout_exercises we ON we.workout_id = uw.workout_id
        JOIN exercises e ON e.id = we.exercise_id
        JOIN exercise_sets es ON es.workout_exercise_id = we.id
        JOIN set_metrics sm ON sm.exercise_set_id = es.id
        WHERE uw.user_id = $1
          AND uw.status = 'completed'
        GROUP BY uw.id, uw.wellness_rating, e.muscle_group, es.id
      )
      SELECT
        muscle_group,
        COUNT(DISTINCT workout_id) AS total_workouts,
        COALESCE(SUM(reps * weight), 0) AS total_volume,
        COALESCE(AVG(wellness_rating), 0) AS avg_wellness_rating
      FROM set_data
      GROUP BY muscle_group
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

  async getRPEData(userId: number): Promise<any[]> {
    const query = `
      SELECT 
        uw.scheduled_date AS date,
        uw.wellness_rating AS actualRPE,
        COALESCE(uw.planned_difficulty, 7) AS plannedRPE
      FROM user_workouts uw
      WHERE uw.user_id = $1
        AND uw.status = 'completed'
        AND uw.wellness_rating IS NOT NULL
      ORDER BY uw.scheduled_date DESC
      LIMIT 30
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }
}