import { Database } from '../../injection/database';
import { IProgressRepository } from '../../domain/interfaces/IProgressRepository';
import { ExerciseProgressDTO, MuscleGroupStatsDTO } from '../../application/dto/ProgressStatsDTO';

export class ProgressRepository implements IProgressRepository {
  constructor(private database: Database) {}

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
        (SELECT mg.name FROM exercise_muscles em
         JOIN muscle_groups mg ON mg.id = em.muscle_group_id
         WHERE em.exercise_id = e.id
         ORDER BY em.priority DESC LIMIT 1) AS muscle_group,
        e.id AS exercise_id,
        sd.scheduled_date AS date,
        COALESCE(AVG(sd.weight), 0) AS avg_weight,
        COALESCE(SUM(sd.reps * sd.weight), 0) AS total_volume,
        COALESCE(MAX(sd.reps), 0) AS max_reps
      FROM set_data sd
      JOIN exercises e ON e.id = $2
      GROUP BY e.name, e.id, sd.scheduled_date
      ORDER BY sd.scheduled_date ASC
      LIMIT $3
    `;

    const result = await this.database.query(query, [userId, exerciseId, limit]);
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
          (SELECT mg.name FROM exercise_muscles em
           JOIN muscle_groups mg ON mg.id = em.muscle_group_id
           WHERE em.exercise_id = e.id
           ORDER BY em.priority DESC LIMIT 1) AS muscle_group,
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
        GROUP BY uw.id, uw.wellness_rating, e.id, es.id
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

    const result = await this.database.query(query, [userId]);
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
    const result = await this.database.query(query, [userId]);
    return result.rows;
  }

  async getExerciseRawSets(userId: number, exerciseId: number): Promise<{ weight: number; reps: number }[]> {
    const query = `
      SELECT 
        sm2.value AS weight,
        sm.value AS reps
      FROM user_workouts uw
      JOIN workout_exercises we ON we.workout_id = uw.workout_id
      JOIN exercise_sets es ON es.workout_exercise_id = we.id
      LEFT JOIN set_metrics sm ON sm.exercise_set_id = es.id AND sm.metric_type = 'reps'
      LEFT JOIN set_metrics sm2 ON sm2.exercise_set_id = es.id AND sm2.metric_type = 'weight'
      WHERE uw.user_id = $1
        AND we.exercise_id = $2
        AND uw.status = 'completed'
        AND sm.value IS NOT NULL
        AND sm2.value IS NOT NULL
      ORDER BY uw.scheduled_date ASC, es.set_number ASC
    `;
    const result = await this.database.query(query, [userId, exerciseId]);
    return result.rows.map(row => ({
      weight: parseFloat(row.weight),
      reps: parseInt(row.reps)
    }));
  }

  async getMuscleBalanceRadar(userId: number): Promise<{ muscle: string; volume: number }[]> {
    const categoryMap: Record<string, string> = {
      'chest': 'Грудь',
      'Грудные': 'Грудь',
      'Грудные, трицепс, передняя дельта': 'Грудь',
      'Верх грудных': 'Грудь',
      'Нижняя часть груди': 'Грудь',
      'shoulders': 'Плечи',
      'Дельтовидные (все пучки)': 'Плечи',
      'Дельтовидные (все пучки), трицепс': 'Плечи',
      'Средняя дельта': 'Плечи',
      'Задняя дельта': 'Плечи',
      'Дельты': 'Плечи',
      'Трапециевидные': 'Спина',
      'Трапеции': 'Спина',
      'Широчайшие, трапеции': 'Спина',
      'arms': 'Руки',
      'Бицепс': 'Руки',
      'Трицепс': 'Руки',
      'Плечевая мышца': 'Руки',
      'back': 'Спина',
      'Широчайшие': 'Спина',
      'Широчайшие мышцы спины': 'Спина',
      'Разгибатели спины': 'Спина',
      'Поясничный отдел': 'Спина',
      'Разгибатели спины, ягодичные, бицепс бедра': 'Спина',
      'Широчайшие, бицепс': 'Спина',
      'legs': 'Ноги',
      'Квадрицепсы, ягодичные': 'Ноги',
      'Квадрицепсы': 'Ноги',
      'Ягодичные': 'Ноги',
      'Бицепс бедра': 'Ноги',
      'Икры': 'Ноги',
      'Икроножные мышцы': 'Ноги',
      'Внутренняя часть бедра': 'Ноги',
      'core': 'Пресс',
      'Пресс': 'Пресс',
      'Косые мышцы живота': 'Пресс',
      'Прямая мышца живота': 'Пресс',
      'Кор': 'Пресс'
    };

    const query = `
      WITH set_data AS (
        SELECT
          (SELECT mg.name FROM exercise_muscles em
           JOIN muscle_groups mg ON mg.id = em.muscle_group_id
           WHERE em.exercise_id = e.id
           ORDER BY em.priority DESC LIMIT 1) AS muscle_group,
          SUM(COALESCE(sm2.value, 0) * COALESCE(sm.value, 0)) AS volume
        FROM user_workouts uw
        JOIN workout_exercises we ON we.workout_id = uw.workout_id
        JOIN exercises e ON e.id = we.exercise_id
        JOIN exercise_sets es ON es.workout_exercise_id = we.id
        LEFT JOIN set_metrics sm ON sm.exercise_set_id = es.id AND sm.metric_type = 'reps'
        LEFT JOIN set_metrics sm2 ON sm2.exercise_set_id = es.id AND sm2.metric_type = 'weight'
        WHERE uw.user_id = $1
          AND uw.status = 'completed'
        GROUP BY e.id
      )
      SELECT muscle_group, SUM(volume) AS total_volume
      FROM set_data
      GROUP BY muscle_group
    `;

    const result = await this.database.query(query, [userId]);

    const categoryVolumes: Record<string, number> = {
      'Грудь': 0,
      'Плечи': 0,
      'Руки': 0,
      'Спина': 0,
      'Ноги': 0,
      'Пресс': 0
    };

    for (const row of result.rows) {
      const originalGroup = row.muscle_group;
      const category = categoryMap[originalGroup];
      if (category && categoryVolumes.hasOwnProperty(category)) {
        categoryVolumes[category] += parseFloat(row.total_volume);
      } else {
        console.warn(`Неизвестная группа мышц: ${originalGroup} [ProgressRepository.ts]`);
      }
    }

    return Object.entries(categoryVolumes).map(([muscle, volume]) => ({ muscle, volume }));
  }
}