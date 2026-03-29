import { Pool } from 'pg';
import { IWorkoutRepository } from '../../domain/interfaces/IWorkoutRepository';
import { Workout, UserWorkout, Exercise, WorkoutExercise, WorkoutStatus } from '../../domain/entities/Workout';

export class WorkoutRepository implements IWorkoutRepository {
  constructor(private pool: Pool) {}

  async getWorkoutById(id: number): Promise<Workout | null> {
    const workoutQuery = 'SELECT * FROM workouts WHERE id = $1';
    const workoutResult = await this.pool.query(workoutQuery, [id]);
    
    if (workoutResult.rows.length === 0) return null;

    const exercisesQuery = `
      SELECT e.*, we.sets, we.rep_min, we.rep_max, we.rest_seconds, we.order_index
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
        repMin: row.rep_min,
        repMax: row.rep_max,
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

  async getBaseWorkout(): Promise<Workout | null> {
    const query = 'SELECT * FROM workouts WHERE name LIKE $1 LIMIT 1';
    const result = await this.pool.query(query, ['%Базовая%']);
    
    if (result.rows.length === 0) return null;
    
    return this.getWorkoutById(result.rows[0].id);
  }

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

    const result = await this.pool.query(query, values);
    
    return new UserWorkout({
      ...userWorkout,
      id: result.rows[0].id,
      completedAt: result.rows[0].created_at,
    });
  }

  async getUserWorkouts(userId: number, limit: number = 10): Promise<UserWorkout[]> {
    const query = `
      SELECT uw.*, w.name as workout_name, w.description as workout_description
      FROM user_workouts uw
      JOIN workouts w ON uw.workout_id = w.id
      WHERE uw.user_id = $1
      ORDER BY uw.scheduled_date DESC
      LIMIT $2
    `;
    
    const result = await this.pool.query(query, [userId, limit]);
    
    return result.rows.map((row: any) => {
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
      });
    });
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
    
    const row = result.rows[0];
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
    });
  }

  async updateUserWorkoutStatus(id: number, status: string, wellnessRating?: number, comments?: string): Promise<void> {
    const query = `
      UPDATE user_workouts 
      SET status = $1, wellness_rating = $2, comments = $3, completed_at = $4
      WHERE id = $5
    `;
    
    const completedAt = status === 'completed' ? new Date() : null;
    
    await this.pool.query(query, [status, wellnessRating || null, comments || null, completedAt, id]);
  }

  async getAllExercises(): Promise<Exercise[]> {
    const query = 'SELECT * FROM exercises ORDER BY muscle_group, name';
    const result = await this.pool.query(query);
    
    return result.rows.map((row: any) => new Exercise({
      id: row.id,
      name: row.name,
      description: row.description,
      muscleGroup: row.muscle_group,
      equipmentType: row.equipment_type,
    }));
  }
}