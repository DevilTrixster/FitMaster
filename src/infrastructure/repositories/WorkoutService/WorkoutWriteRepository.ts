import { Database } from '../../../injection/database';
import { UserWorkout } from '../../../domain/entities'; 

export class WorkoutWriteRepository {
  constructor(private database: Database) {}

  async createUserWorkout(userWorkout: UserWorkout): Promise<UserWorkout> {
    const query = `
      INSERT INTO user_workouts (user_id, workout_id, scheduled_date, scheduled_time, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, created_at
    `;
    const values = [
      userWorkout.userId,
      userWorkout.workout.id,
      userWorkout.scheduledDate,
      userWorkout.scheduledTime || '10:00',
      userWorkout.status,
    ];
    const result = await this.database.query(query, values);
    return new UserWorkout({
      ...userWorkout,
      id: result.rows[0].id,
      completedAt: result.rows[0].created_at,
    });
  }

  async updateUserWorkoutStatus(id: number, status: string, wellnessRating?: number, comments?: string): Promise<void> {
    const query = `
      UPDATE user_workouts 
      SET status = $1, wellness_rating = $2, comments = $3, completed_at = $4
      WHERE id = $5
    `;
    const completedAt = status === 'completed' ? new Date() : null;
    await this.database.query(query, [status, wellnessRating || null, comments || null, completedAt, id]);
  }

  async startUserWorkout(id: number): Promise<void> {
    await this.database.query('UPDATE user_workouts SET status = $1 WHERE id = $2', ['in_progress', id]);
  }

  async pauseUserWorkout(id: number, lastExerciseIndex: number): Promise<void> {
    await this.database.query(
      'UPDATE user_workouts SET paused_at = CURRENT_TIMESTAMP, last_exercise_index = $1 WHERE id = $2',
      [lastExerciseIndex, id]
    );
  }

  async resumeUserWorkout(id: number): Promise<void> {
    await this.database.query('UPDATE user_workouts SET paused_at = NULL WHERE id = $1', [id]);
  }

  async rescheduleWorkout(id: number, newDate: Date, reason?: string): Promise<void> {
    await this.database.query(
      `UPDATE user_workouts SET status = 'rescheduled', rescheduled_to = $1, reschedule_reason = $2 WHERE id = $3`,
      [newDate.toISOString().split('T')[0], reason || null, id]
    );
  }

  async skipWorkout(id: number, reason?: string): Promise<void> {
    await this.database.query(
      `UPDATE user_workouts SET status = 'skipped', reschedule_reason = $1 WHERE id = $2`,
      [reason || null, id]
    );
  }

  async updateFutureWorkoutsTime(userId: number, newTime: string): Promise<void> {
    const query = `
      UPDATE user_workouts
      SET scheduled_time = $1::time, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2 AND status = 'scheduled' AND scheduled_date >= CURRENT_DATE
    `;
    await this.database.query(query, [newTime, userId]);
  }

  async deleteScheduledWorkoutsFrom(userId: number, fromDate: Date): Promise<void> {
  const query = `
    DELETE FROM user_workouts
    WHERE user_id = $1 AND status = 'scheduled' AND scheduled_date >= $2
  `;
  await this.database.query(query, [userId, fromDate]);
  }

  async createUserWorkoutBatch(workouts: UserWorkout[]): Promise<void> {
    if (workouts.length === 0) return;
    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');
      for (const w of workouts) {
        const query = `
          INSERT INTO user_workouts (user_id, workout_id, scheduled_date, scheduled_time, status)
          VALUES ($1, $2, $3, $4, $5)
        `;
        await client.query(query, [
          w.userId,
          w.workout.id,
          w.scheduledDate,
          w.scheduledTime || '10:00',
          w.status
        ]);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async postponeWorkout(workoutId: number, newDate: Date): Promise<void> {
    const query = `
      UPDATE user_workouts 
      SET scheduled_date = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await this.database.query(query, [newDate.toISOString().split('T')[0], workoutId]);
  }

  async deleteGlobalAdaptations(userId: number): Promise<void> {
    await this.database.query('DELETE FROM workout_adaptations WHERE user_id = $1 AND user_workout_id IS NULL', [userId]);
  }
}