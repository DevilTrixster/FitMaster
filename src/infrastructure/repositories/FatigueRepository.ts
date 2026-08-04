import { Database } from '../../injection/database';
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

  async saveDailyMetrics(metrics: DailyMetrics): Promise<void> {
    const query = `
      INSERT INTO fatigue_recovery (user_id, date, fatigue_score, recovery_score, performance_trend, adaptation_rate, injury_risk, raw_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id, date)
      DO UPDATE SET
        fatigue_score = EXCLUDED.fatigue_score,
        recovery_score = EXCLUDED.recovery_score,
        performance_trend = EXCLUDED.performance_trend,
        adaptation_rate = EXCLUDED.adaptation_rate,
        injury_risk = EXCLUDED.injury_risk,
        raw_data = EXCLUDED.raw_data
    `;
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

  async updateMuscleRecovery(records: MuscleRecoveryRecord[]): Promise<void> {
    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');
      for (const record of records) {
        const muscleGroupId = await this.getMuscleGroupId(record.muscleGroup);
        const query = `
          INSERT INTO muscle_recovery (user_id, muscle_group_id, last_trained_date, recovery_percentage)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id, muscle_group_id)
          DO UPDATE SET
            last_trained_date = EXCLUDED.last_trained_date,
            recovery_percentage = EXCLUDED.recovery_percentage
        `;
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

  async getMuscleRecovery(userId: number): Promise<MuscleRecoveryRecord[]> {
    const query = `
      SELECT mr.user_id, mg.name AS muscle_group, mr.last_trained_date, mr.recovery_percentage
      FROM muscle_recovery mr
      JOIN muscle_groups mg ON mg.id = mr.muscle_group_id
      WHERE mr.user_id = $1
    `;
    const result = await this.database.query(query, [userId]);
    return result.rows.map((row: any) => ({
      userId: row.user_id,
      muscleGroup: row.muscle_group, // здесь уже русское название, что допустимо
      lastTrainedDate: row.last_trained_date,
      recoveryPercentage: row.recovery_percentage,
    }));
  }
}