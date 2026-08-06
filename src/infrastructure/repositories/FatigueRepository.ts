import { Database } from '../../injection/database';
import { bquery } from './bquery';
import { IFatigueRepository, DailyMetrics, MuscleRecoveryRecord } from '../../domain/interfaces/IFatigueRepository';

export class FatigueRepository implements IFatigueRepository {
  // Карта перевода английских названий групп мышц в русские (как в таблице muscle_groups)
  private static englishToRussian: Record<string, string> = {
    chest: 'Грудь',
    back: 'Спина',
    legs: 'Ноги',
    shoulders: 'Плечи',
    arms: 'Руки',
    core: 'Кор',
  };

  constructor(private database: Database) {}

  // Сохранение ежедневных показателей
  async saveDailyMetrics(metrics: DailyMetrics): Promise<void> {
    const query = bquery.q_saveDailyMetrics;
    await this.database.query(query, [
      metrics.userId,
      metrics.date,
      metrics.fatigueScore,
      metrics.recoveryScore,
      metrics.performanceTrend,
      metrics.adaptationRate ?? 0,
      metrics.injuryRisk,
      metrics.rawData || null,
    ]);
  }

  // Поиск ID группы мышц с поддержкой перевода английских названий
  private async getMuscleGroupId(name: string): Promise<number> {
    const lowerName = name.toLowerCase();
    // Сначала пробуем перевести с английского
    const resolvedName = FatigueRepository.englishToRussian[lowerName] || name;
    const res = await this.database.query(
      `SELECT id FROM muscle_groups WHERE name = $1 LIMIT 1`,
      [resolvedName]
    );
    if (res.rows.length === 0) {
      throw new Error(`Muscle group '${name}' (resolved to '${resolvedName}') not found`);
    }
    return res.rows[0].id;
  }

  // Обновить мышечное восстановление
  async updateMuscleRecovery(records: MuscleRecoveryRecord[]): Promise<void> {
    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');
      for (const record of records) {
        const muscleGroupId = await this.getMuscleGroupId(record.muscleGroup);
        const query = bquery.q_updateMuscleRecovery;
        await client.query(query, [
          record.userId,
          muscleGroupId,
          record.lastTrainedDate,
          record.recoveryPercentage,
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

  // Получение мышечного восстановления
  async getMuscleRecovery(userId: number): Promise<MuscleRecoveryRecord[]> {
    const query = bquery.q_getMuscleRecovery;
    const result = await this.database.query(query, [userId]);
    return result.rows.map((row: any) => ({
      userId: row.user_id,
      muscleGroup: row.muscle_group, // здесь уже русское название, что допустимо
      lastTrainedDate: row.last_trained_date,
      recoveryPercentage: row.recovery_percentage,
    }));
  }
}