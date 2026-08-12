import { Exercise, MetricType, ExerciseSet, SetMetric } from '../../../domain/entities';
import { IMetricTemplate } from '../../../domain/interfaces/IMetricTemplate';
import { Database } from '../../../injection/database';
import { bquery } from '../bquery';

export class ExerciseRepository {
  constructor(private database: Database) {}

  // Получить все упражнения
  async getAllExercises(): Promise<Exercise[]> {
    const query = bquery.q_getAllExercises;
    const result = await this.database.query(query);
    return result.rows.map((row: any) => new Exercise({
      id: row.id,
      name: row.name,
      description: row.description,
      muscleGroup: row.muscle_group,
      equipmentType: row.equipment_type,
    }));
  }

  // Получить упражнение по ID
  async getExerciseById(id: number): Promise<Exercise | null> {
    const query = bquery.q_getExerciseById;
    const result = await this.database.query(query, [id]);
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

  // Получить шаблоны метрик упражнения
  async getExerciseMetricTemplates(exerciseId: number): Promise<IMetricTemplate[]> {
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

  // Получить конкретное упражнение конкретной пользовательской тренировки
  async getUserWorkoutExerciseId(
      userWorkoutId: number,
      exerciseId: number
  ): Promise<number | null> {
      const res = await this.database.query(
          `
          SELECT uwe.id
          FROM user_workout_exercises uwe
          JOIN workout_exercises we
              ON we.id = uwe.workout_exercise_id
          WHERE uwe.user_workout_id = $1
            AND we.exercise_id = $2
          LIMIT 1
          `,
          [userWorkoutId, exerciseId]
      );

      return res.rows.length > 0
          ? res.rows[0].id
          : null;
  }

  // Создать или обновить подход
  async saveExerciseSet(userWorkoutExerciseId: number, exerciseSet: ExerciseSet): Promise<ExerciseSet> {
    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');

      // Проверяем, существует ли уже подход с таким номером
      const existingSet = await client.query(
        `SELECT id FROM exercise_sets 
         WHERE user_workout_exercise_id = $1 AND set_number = $2`,
        [userWorkoutExerciseId, exerciseSet.setNumber]
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
          `INSERT INTO exercise_sets (user_workout_exercise_id, set_number, set_type)
           VALUES ($1, $2, $3) RETURNING id`,
          [userWorkoutExerciseId, exerciseSet.setNumber, exerciseSet.setType]
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
        userWorkoutExerciseId,
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // Получить подходы конкретного упражнения конкретной тренировки пользователя
  async getExerciseSets(userWorkoutExerciseId: number): Promise<ExerciseSet[]> {
    const query = bquery.q_getExerciseSets;
    const result = await this.database.query(query, [userWorkoutExerciseId]);
    const setsMap = new Map<number, ExerciseSet>();

    result.rows.forEach(row => {
        if (!setsMap.has(row.set_id)) {
            setsMap.set(
                row.set_id,
                new ExerciseSet({
                    id: row.set_id,
                    setNumber: row.set_number,
                    setType: row.set_type,
                    metrics: [],
                    userWorkoutExerciseId,
                })
            );
        }
        if (row.metric_id) {
            setsMap.get(row.set_id)!.metrics.push(
                new SetMetric({
                    id: row.metric_id,
                    exerciseSetId: row.set_id,
                    metricType: row.metric_type as MetricType,
                    value: parseFloat(row.value),
                    unit: row.unit,
                })
            );
        }
    });

    return Array.from(setsMap.values()).sort((a, b) => a.setNumber - b.setNumber);
  }
}