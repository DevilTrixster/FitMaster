import { Pool } from 'pg';
import { IWorkoutRepository } from '../../domain/interfaces/IWorkoutRepository';
import { Workout, UserWorkout, Exercise, WorkoutExercise, WorkoutStatus, SetResult, WorkoutAdaptation, AdaptationType } from '../../domain/entities/Workout';

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
      ORDER BY uw.scheduled_date ASC, uw.scheduled_time ASC 
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

  async startUserWorkout(id: number): Promise<void> {
    const query = `
      UPDATE user_workouts 
      SET status = $1
      WHERE id = $2
    `;
    
    await this.pool.query(query, ['in_progress', id]);
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

  async saveSetResult(userWorkoutId: number, exerciseId: number, setResult: SetResult): Promise<void> {
    const query = `
      INSERT INTO workout_results 
      (user_workout_id, exercise_id, set_number, target_reps, target_weight, actual_reps, actual_weight, completed, completed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    
    const values = [
      userWorkoutId,
      exerciseId,
      setResult.setNumber,
      setResult.targetReps,
      setResult.targetWeight || null,
      setResult.actualReps || null,
      setResult.actualWeight || null,
      setResult.completed,
      setResult.completedAt || new Date(),
    ];

    await this.pool.query(query, values);
  }

  async getExerciseResults(userWorkoutId: number, exerciseId: number): Promise<SetResult[]> {
    const query = `
      SELECT set_number, target_reps, target_weight, actual_reps, actual_weight, completed, completed_at
      FROM workout_results
      WHERE user_workout_id = $1 AND exercise_id = $2
      ORDER BY set_number
    `;
    
    const result = await this.pool.query(query, [userWorkoutId, exerciseId]);
    
    return result.rows.map((row: any) => new SetResult({
      setNumber: row.set_number,
      targetReps: row.target_reps,
      targetWeight: row.target_weight,
      actualReps: row.actual_reps,
      actualWeight: row.actual_weight,
      completed: row.completed,
      completedAt: row.completed_at,
    }));
  }

  async saveAdaptation(adaptation: WorkoutAdaptation): Promise<void> {
    const query = `
      INSERT INTO workout_adaptations 
      (user_id, user_workout_id, exercise_id, previous_weight, new_weight, previous_reps, new_reps, adaptation_reason)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    
    const values = [
      adaptation.userId,
      adaptation.id,
      adaptation.exerciseId,
      adaptation.previousWeight,
      adaptation.newWeight,
      adaptation.previousReps,
      adaptation.newReps,
      adaptation.reason,
    ];

    await this.pool.query(query, values);
  }

  async pauseUserWorkout(id: number, lastExerciseIndex: number): Promise<void> {
  const query = `
    UPDATE user_workouts 
    SET paused_at = CURRENT_TIMESTAMP, last_exercise_index = $1
    WHERE id = $2
  `;
  await this.pool.query(query, [lastExerciseIndex, id]);
  }

  async resumeUserWorkout(id: number): Promise<void> {
    const query = `
      UPDATE user_workouts 
      SET paused_at = NULL
      WHERE id = $2
    `;
    await this.pool.query(query, [id]);
  }

  async getUserActiveWorkout(userId: number): Promise<UserWorkout | null> {
    const query = `
      SELECT uw.*, w.name as workout_name, w.description as workout_description
      FROM user_workouts uw
      JOIN workouts w ON uw.workout_id = w.id
      WHERE uw.user_id = $1 AND uw.status = $2
      ORDER BY uw.scheduled_date ASC
      LIMIT 1
    `;
    
    const result = await this.pool.query(query, [userId, 'in_progress']);
    
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
      startedAt: row.started_at,
      pausedAt: row.paused_at,
      lastExerciseIndex: row.last_exercise_index,
    });
  }

  async getWorkoutHistory(
    userId: number, 
    limit: number, 
    offset: number,
    status?: string,
    dateFrom?: string,
    dateTo?: string
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

  async getUserAdaptations(userId: number, exerciseId: number, limit: number = 10): Promise<WorkoutAdaptation[]> {
    const query = `
      SELECT * FROM workout_adaptations
      WHERE user_id = $1 AND exercise_id = $2
      ORDER BY created_at DESC
      LIMIT $3
    `;
    
    const result = await this.pool.query(query, [userId, exerciseId, limit]);
    
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

  async rescheduleWorkout(id: number, newDate: Date, reason?: string): Promise<void> {
    const query = `
      UPDATE user_workouts 
      SET status = 'rescheduled', rescheduled_to = $1, reschedule_reason = $2 
      WHERE id = $3
    `;
    await this.pool.query(query, [newDate.toISOString().split('T')[0], reason || null, id]);
  }

  async skipWorkout(id: number, reason?: string): Promise<void> {
    const query = `
      UPDATE user_workouts 
      SET status = 'skipped', reschedule_reason = $1 
      WHERE id = $2
    `;
    await this.pool.query(query, [reason || null, id]);
  }
  async getSplitPrograms(): Promise<Workout[]> {
    // Мы ищем программы с ID 1, 2 и 3.
    // ID 1 = Ноги (бывшая Full Body)
    // ID 2 = Грудь
    // ID 3 = Спина
    const query = `SELECT * FROM workouts WHERE id IN (1, 2, 3) ORDER BY id ASC`;
    const result = await this.pool.query(query);

    if (result.rows.length === 0) return [];

    // Загружаем упражнения для каждой программы
    const workouts: Workout[] = [];
    for (const row of result.rows) {
      const workout = await this.getWorkoutById(row.id);
      if (workout) workouts.push(workout);
    }
    
    return workouts;
  }
}