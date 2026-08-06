import { Database } from '../../injection/database';
import { bquery } from './bquery';
import { IProgressRepository } from '../../domain/interfaces/IProgressRepository';
import { ExerciseProgressDTO, MuscleGroupStatsDTO } from '../../application/dto/ProgressStatsDTO';

export class ProgressRepository implements IProgressRepository {
  constructor(private database: Database) {}

  // Получение упражнения в прогрессе
  async getExerciseProgress(userId: number, exerciseId: number, limit: number = 30): Promise<ExerciseProgressDTO | null> {
    const query = bquery.q_getExerciseProgress;
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

  // Получение статуса по мышечной группе
  async getMuscleGroupStats(userId: number): Promise<MuscleGroupStatsDTO[]> {
    const query = bquery.q_getMuscleGroupStats;
    const result = await this.database.query(query, [userId]);
    return result.rows.map((row: any) => ({
      muscleGroup: row.muscle_group,
      totalWorkouts: parseInt(row.total_workouts),
      totalVolume: parseFloat(row.total_volume),
      avgWellnessRating: parseFloat(row.avg_wellness_rating),
    }));
  }

  // Получение данных RPEData
  async getRPEData(userId: number): Promise<any[]> {
    const query = bquery.q_getRPEData;
    const result = await this.database.query(query, [userId]);
    return result.rows;
  }

  // Получение результатов упражнения
  async getExerciseRawSets(userId: number, exerciseId: number): Promise<{ weight: number; reps: number }[]> {
    const query = bquery.q_ProgressRepository;
    const result = await this.database.query(query, [userId, exerciseId]);
    return result.rows.map(row => ({
      weight: parseFloat(row.weight),
      reps: parseInt(row.reps)
    }));
  }

  // Получите радиолокатор мышечного баланса
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

    const query = bquery.q_getMuscleBalanceRadar;
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