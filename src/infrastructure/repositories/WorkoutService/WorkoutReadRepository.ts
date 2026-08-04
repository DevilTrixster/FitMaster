import { Database } from '../../../injection/database';
import { Workout, UserWorkout, WorkoutStatus, WorkoutExercise, Exercise } from '../../../domain/entities';
import { ExerciseRepository } from './ExerciseRepository';

export class WorkoutReadRepository {
  private exerciseRepo: ExerciseRepository;

  constructor(private database: Database) {
    this.exerciseRepo = new ExerciseRepository(database);
  }

  async getWorkoutById(id: number): Promise<Workout | null> {
    const workoutQuery = 'SELECT * FROM workouts WHERE id = $1';
    const workoutResult = await this.database.query(workoutQuery, [id]);
    if (workoutResult.rows.length === 0) return null;

    const exercisesQuery = `
      SELECT e.*,
             (SELECT mg.name FROM exercise_muscles em
              JOIN muscle_groups mg ON mg.id = em.muscle_group_id
              WHERE em.exercise_id = e.id
              ORDER BY em.priority DESC LIMIT 1) AS muscle_group,
             we.sets, we.rest_seconds, we.order_index
      FROM workout_exercises we
      JOIN exercises e ON we.exercise_id = e.id
      WHERE we.workout_id = $1
      ORDER BY we.order_index
    `;
    const exercisesResult = await this.database.query(exercisesQuery, [id]);

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
    const result = await this.database.query(query, [userId, limit]);
    return result.rows.map((row: any) => this.mapRowToUserWorkout(row));
  }

  async getUserWorkoutById(id: number): Promise<UserWorkout | null> {
    const query = `
      SELECT uw.*, w.name as workout_name, w.description as workout_description
      FROM user_workouts uw
      JOIN workouts w ON uw.workout_id = w.id
      WHERE uw.id = $1
    `;
    const result = await this.database.query(query, [id]);
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

    const result = await this.database.query(query, params);
    return result.rows.map((row: any) => this.mapRowToUserWorkout(row));
  }

  async getCompletedWorkoutsHistory(
    userId: number,
    limit: number,
    offset: number,
    sortBy: string = 'scheduled_date',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
    dateFrom?: string,
    dateTo?: string,
    exerciseId?: number,
    muscleGroup?: string
  ): Promise<UserWorkout[]> {
    let query = `
      SELECT uw.*, w.name as workout_name, w.description as workout_description
      FROM user_workouts uw
      JOIN workouts w ON uw.workout_id = w.id
      WHERE uw.user_id = $1 AND uw.status = 'completed'
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

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
    if (exerciseId) {
      query += ` AND EXISTS (
        SELECT 1 FROM workout_exercises we
        WHERE we.workout_id = uw.workout_id AND we.exercise_id = $${paramIndex}
      )`;
      params.push(exerciseId);
      paramIndex++;
    }
    if (muscleGroup) {
      query += ` AND EXISTS (
        SELECT 1 FROM workout_exercises we
        JOIN exercises e ON e.id = we.exercise_id
        WHERE we.workout_id = uw.workout_id AND e.muscle_group = $${paramIndex}
      )`;
      params.push(muscleGroup);
      paramIndex++;
    }

    const allowedSortFields = ['scheduled_date', 'wellness_rating', 'total_volume'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'scheduled_date';
    query += ` ORDER BY ${sortField} ${sortOrder === 'ASC' ? 'ASC' : 'DESC'}`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await this.database.query(query, params);
    return result.rows.map((row: any) => this.mapRowToUserWorkout(row));
  }

  async countCompletedWorkouts(
    userId: number,
    dateFrom?: string,
    dateTo?: string,
    exerciseId?: number,
    muscleGroup?: string
  ): Promise<number> {
    let query = `
      SELECT COUNT(*) as count
      FROM user_workouts uw
      WHERE uw.user_id = $1 AND uw.status = 'completed'
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

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
    if (exerciseId) {
      query += ` AND EXISTS (
        SELECT 1 FROM workout_exercises we
        WHERE we.workout_id = uw.workout_id AND we.exercise_id = $${paramIndex}
      )`;
      params.push(exerciseId);
      paramIndex++;
    }
    if (muscleGroup) {
      query += ` AND EXISTS (
        SELECT 1 FROM workout_exercises we
        JOIN exercises e ON e.id = we.exercise_id
        WHERE we.workout_id = uw.workout_id AND e.muscle_group = $${paramIndex}
      )`;
      params.push(muscleGroup);
      paramIndex++;
    }

    const result = await this.database.query(query, params);
    return parseInt(result.rows[0].count, 10);
  }

  async getWorkoutDetails(workoutId: number, userId: number): Promise<any> {
    const userWorkout = await this.getUserWorkoutById(workoutId);
    if (!userWorkout || userWorkout.userId !== userId) return null;

    const workout = await this.getWorkoutById(userWorkout.workout.id!);
    if (!workout) return null;

    const exercisesWithSets = await Promise.all(workout.exercises.map(async (we) => {
      const weId = await this.exerciseRepo.getWorkoutExerciseId(workoutId, we.exercise.id!);
      const sets = weId ? await this.exerciseRepo.getExerciseSets(weId) : [];
      const mappedSets = sets.map((set: any) => ({
        setNumber: set.setNumber,
        setType: set.setType,
        metrics: set.metrics.map((m: any) => ({
          metricType: m.metricType,
          value: m.value,
          unit: m.unit
        }))
      }));
      return {
        exercise: {
          id: we.exercise.id,
          name: we.exercise.name,
          muscleGroup: we.exercise.muscleGroup
        },
        sets: we.sets,
        restSeconds: we.restSeconds,
        completedSets: mappedSets
      };
    }));

    return {
      id: userWorkout.id,
      scheduledDate: userWorkout.scheduledDate,
      scheduledTime: userWorkout.scheduledTime,
      wellnessRating: userWorkout.wellnessRating,
      comments: userWorkout.comments,
      completedAt: userWorkout.completedAt,
      workout: {
        id: workout.id,
        name: workout.name,
        description: workout.description
      },
      exercises: exercisesWithSets
    };
  }

  async getSplitPrograms(): Promise<Workout[]> {
    const query = `SELECT * FROM workouts WHERE id IN (1, 2, 3) ORDER BY id ASC`;
    const result = await this.database.query(query);
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
    const result = await this.database.query(query, [userId]);
    if (result.rows.length === 0) return null;
    return this.mapRowToUserWorkout(result.rows[0]);
  }

  async getDailyWorkoutVolumes(userId: number, days: number): Promise<Array<{ date: string; volume: number }>> {
    const query = `
      SELECT uw.scheduled_date::text AS date,
            COALESCE(SUM(sm.value * sm2.value), 0) AS volume
      FROM user_workouts uw
      JOIN workout_exercises we ON we.workout_id = uw.workout_id
      JOIN exercise_sets es ON es.workout_exercise_id = we.id
      LEFT JOIN set_metrics sm ON sm.exercise_set_id = es.id AND sm.metric_type = 'reps'
      LEFT JOIN set_metrics sm2 ON sm2.exercise_set_id = es.id AND sm2.metric_type = 'weight'
      WHERE uw.user_id = $1
        AND uw.status = 'completed'
        AND uw.scheduled_date >= CURRENT_DATE - $2::int
      GROUP BY uw.scheduled_date
      ORDER BY uw.scheduled_date DESC
    `;
    const result = await this.database.query(query, [userId, days]);
    return result.rows.map((row: any) => ({
      date: row.date,
      volume: parseFloat(row.volume),
    }));
  }

  async getWorkoutsInRange(userId: number, startDate: Date, endDate: Date): Promise<UserWorkout[]> {
    const query = `
      SELECT uw.*, w.name as workout_name, w.description as workout_description
      FROM user_workouts uw
      JOIN workouts w ON uw.workout_id = w.id
      WHERE uw.user_id = $1 AND uw.scheduled_date BETWEEN $2 AND $3
      ORDER BY uw.scheduled_date ASC
    `;
    const result = await this.database.query(query, [userId, startDate, endDate]);
    return result.rows.map((row: any) => this.mapRowToUserWorkout(row));
  }

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