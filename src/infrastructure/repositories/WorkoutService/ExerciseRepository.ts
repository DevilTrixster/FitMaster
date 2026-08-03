
import { Exercise, MetricTemplate, MetricType, ExerciseSet, SetMetric } from '../../../domain/entities';
import { Database } from '../../../injection/database';

export class ExerciseRepository {
  constructor(private database: Database) {}

  async getAllExercises(): Promise<Exercise[]> {
    const result = await this.database.query('SELECT * FROM exercises ORDER BY muscle_group, name');
    return result.rows.map((row: any) => new Exercise({
      id: row.id,
      name: row.name,
      description: row.description,
      muscleGroup: row.muscle_group,
      equipmentType: row.equipment_type,
    }));
  }

  async getExerciseById(id: number): Promise<Exercise | null> {
    const result = await this.database.query('SELECT * FROM exercises WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return new Exercise({
      id: row.id,
      name: row.name,
      description: row.description,
      muscleGroup: row.muscle_group,
      equipmentType: row.equipment_type,
    });
  }

  async getExerciseMetricTemplates(exerciseId: number): Promise<MetricTemplate[]> {
    const result = await this.database.query(
      'SELECT metric_type, required, default_value, unit FROM exercise_metric_templates WHERE exercise_id = $1',
      [exerciseId]
    );
    return result.rows.map(row => ({
      metricType: row.metric_type as MetricType,
      required: row.required,
      defaultValue: row.default_value ? parseFloat(row.default_value) : undefined,
      unit: row.unit,
    }));
  }

  async getWorkoutExerciseId(userWorkoutId: number, exerciseId: number): Promise<number | null> {
    const res = await this.database.query(
      `SELECT we.id FROM workout_exercises we
       JOIN user_workouts uw ON we.workout_id = uw.workout_id
       WHERE uw.id = $1 AND we.exercise_id = $2`,
      [userWorkoutId, exerciseId]
    );
    return res.rows.length > 0 ? res.rows[0].id : null;
  }

  // Upsert: обновляет существующий подход или создаёт новый
  async saveExerciseSet(workoutExerciseId: number, exerciseSet: ExerciseSet): Promise<ExerciseSet> {
    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');

      // Проверяем, существует ли уже подход с таким номером
      const existingSet = await client.query(
        `SELECT id FROM exercise_sets 
         WHERE workout_exercise_id = $1 AND set_number = $2`,
        [workoutExerciseId, exerciseSet.setNumber]
      );

      let setId: number;
      if (existingSet.rows.length > 0) {
        // Обновляем существующий подход
        setId = existingSet.rows[0].id;
        await client.query(
          `UPDATE exercise_sets SET set_type = $1 WHERE id = $2`,
          [exerciseSet.setType, setId]
        );
        // Удаляем старые метрики
        await client.query(`DELETE FROM set_metrics WHERE exercise_set_id = $1`, [setId]);
      } else {
        // Создаём новый подход
        const insertSet = await client.query(
          `INSERT INTO exercise_sets (workout_exercise_id, set_number, set_type)
           VALUES ($1, $2, $3) RETURNING id`,
          [workoutExerciseId, exerciseSet.setNumber, exerciseSet.setType]
        );
        setId = insertSet.rows[0].id;
      }

      // Вставляем новые метрики
      for (const metric of exerciseSet.metrics) {
        await client.query(
          `INSERT INTO set_metrics (exercise_set_id, metric_type, value, unit)
           VALUES ($1, $2, $3, $4)`,
          [setId, metric.metricType, metric.value, metric.unit]
        );
      }

      await client.query('COMMIT');

      return new ExerciseSet({
        ...exerciseSet,
        id: setId,
        workoutExerciseId,
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getExerciseSets(workoutExerciseId: number): Promise<ExerciseSet[]> {
    const query = `
      SELECT es.id as set_id, es.set_number, es.set_type,
             sm.id as metric_id, sm.metric_type, sm.value, sm.unit
      FROM exercise_sets es
      LEFT JOIN set_metrics sm ON sm.exercise_set_id = es.id
      WHERE es.workout_exercise_id = $1
      ORDER BY es.set_number, sm.metric_type
    `;
    const result = await this.database.query(query, [workoutExerciseId]);
    const setsMap = new Map<number, ExerciseSet>();
    result.rows.forEach(row => {
      if (!setsMap.has(row.set_id)) {
        setsMap.set(row.set_id, new ExerciseSet({
          id: row.set_id,
          setNumber: row.set_number,
          setType: row.set_type,
          metrics: [],
          workoutExerciseId,
        }));
      }
      if (row.metric_id) {
        setsMap.get(row.set_id)!.metrics.push(new SetMetric({
          id: row.metric_id,
          metricType: row.metric_type as MetricType,
          value: parseFloat(row.value),
          unit: row.unit,
        }));
      }
    });
    return Array.from(setsMap.values()).sort((a, b) => a.setNumber - b.setNumber);
  }
}