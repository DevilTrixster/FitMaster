import { Pool } from 'pg';
import { Workout, UserWorkout, WorkoutStatus, WorkoutExercise, Exercise } from '../../../domain/entities/Workout';


export class WorkoutReadRepository {
  constructor(private pool: Pool) {}

  async getWorkoutById(id: number): Promise<Workout | null> {
    const workoutQuery = 'SELECT * FROM workouts WHERE id = $1';
    const workoutResult = await this.pool.query(workoutQuery, [id]);
    if (workoutResult.rows.length === 0) return null;

    const exercisesQuery = `
      SELECT e.*, we.sets, we.rest_seconds, we.order_index
      FROM workout_exercises we
      JOIN exercises e ON we.exercise_id = e.id
      WHERE we.workout_id = $1
      ORDER BY we.order_index
    `;
    const exercisesResult = await this.pool.query(exercisesQuery, [id]);

    const exercises = exercisesResult.rows.map((row: any) => {
      const exercise = new Exercise({
        id: row.id,
        name: row.name,
        description: row.description,
        muscleGroup: row.muscle_group,
        equipmentType: row.equipment_type,
      });
      return new WorkoutExercise({
        exercise,
        sets: row.sets,
        restSeconds: row.rest_seconds,
        orderIndex: row.order_index,
      });
    });

    return new Workout({
      id: workoutResult.rows[0].id,
      name: workoutResult.rows[0].name,
      description: workoutResult.rows[0].description,
      frequencyPerWeek: workoutResult.rows[0].frequency_per_week,
      exercises,
    });
  }

  async getUserWorkouts(userId: number, limit: number = 10): Promise<UserWorkout[]> {
    const query = `
      SELECT uw.*, w.name as workout_name, w.description as workout_description
      FROM user_workouts uw
      JOIN workouts w ON uw.workout_id = w.id
      WHERE uw.user_id = $1
      ORDER BY uw.scheduled_date ASC, uw.scheduled_time ASC 
      LIMIT $2
    `;
    const result = await this.pool.query(query, [userId, limit]);
    return result.rows.map((row: any) => this.mapRowToUserWorkout(row));
  }

  async getUserWorkoutById(id: number): Promise<UserWorkout | null> {
    const query = `
      SELECT uw.*, w.name as workout_name, w.description as workout_description
      FROM user_workouts uw
      JOIN workouts w ON uw.workout_id = w.id
      WHERE uw.id = $1
    `;
    const result = await this.pool.query(query, [id]);
    if (result.rows.length === 0) return null;
    return this.mapRowToUserWorkout(result.rows[0]);
  }
  
  async getWorkoutHistory(
    userId: number, limit: number, offset: number,
    status?: string, dateFrom?: string, dateTo?: string
    ): Promise<UserWorkout[]> {
    let query = `
    SELECT uw.*, w.name as workout_name, w.description as workout_description
    FROM user_workouts uw
    JOIN workouts w ON uw.workout_id = w.id
    WHERE uw.user_id = $1
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (status && status !== 'all') {
    query += ` AND uw.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
    }
    if (dateFrom) {
    query += ` AND uw.scheduled_date >= $${paramIndex}`;
    params.push(dateFrom);
    paramIndex++;
    }
    if (dateTo) {
    query += ` AND uw.scheduled_date <= $${paramIndex}`;
    params.push(dateTo);
    paramIndex++;
    }

    query += ` ORDER BY uw.scheduled_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);
    return result.rows.map((row: any) => this.mapRowToUserWorkout(row));
    }

  async getSplitPrograms(): Promise<Workout[]> {
    const query = `SELECT * FROM workouts WHERE id IN (1, 2, 3) ORDER BY id ASC`;
    const result = await this.pool.query(query);
    const workouts: Workout[] = [];
    for (const row of result.rows) {
      const workout = await this.getWorkoutById(row.id);
      if (workout) workouts.push(workout);
    }
    return workouts;
  }

  async getUserActiveWorkout(userId: number): Promise<UserWorkout | null> {
    const query = `
      SELECT uw.*, w.name as workout_name, w.description as workout_description
      FROM user_workouts uw
      JOIN workouts w ON uw.workout_id = w.id
      WHERE uw.user_id = $1 AND uw.status = 'in_progress'
      ORDER BY uw.scheduled_date ASC
      LIMIT 1
    `;
    const result = await this.pool.query(query, [userId]);
    if (result.rows.length === 0) return null;
    return this.mapRowToUserWorkout(result.rows[0]);
  }

  // Вспомогательный маппер
  private mapRowToUserWorkout(row: any): UserWorkout {
    const workout = new Workout({
      id: row.workout_id,
      name: row.workout_name,
      description: row.workout_description,
      frequencyPerWeek: 3,
    });
    return new UserWorkout({
      id: row.id,
      userId: row.user_id,
      workout,
      scheduledDate: row.scheduled_date,
      scheduledTime: row.scheduled_time,
      status: row.status as WorkoutStatus,
      completedAt: row.completed_at,
      wellnessRating: row.wellness_rating,
      comments: row.comments,
      startedAt: row.started_at,
      pausedAt: row.paused_at,
      lastExerciseIndex: row.last_exercise_index,
      rescheduledTo: row.rescheduled_to,
      rescheduleReason: row.reschedule_reason,
    });
  }
}