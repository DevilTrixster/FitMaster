import { Database } from '../../injection/database';
import { IFatigueRepository, DailyMetrics, MuscleRecoveryRecord } from '../../domain/interfaces/IFatigueRepository';

export class FatigueRepository implements IFatigueRepository {
  constructor(private database: Database) {}

  async saveDailyMetrics(metrics: DailyMetrics): Promise<void> {
    const query = `
      INSERT INTO fatigue_recovery (user_id, date, fatigue_score, recovery_score, performance_trend, injury_risk, raw_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, date)
      DO UPDATE SET
        fatigue_score = EXCLUDED.fatigue_score,
        recovery_score = EXCLUDED.recovery_score,
        performance_trend = EXCLUDED.performance_trend,
        injury_risk = EXCLUDED.injury_risk,
        raw_data = EXCLUDED.raw_data
    `;
    await this.database.query(query, [
      metrics.userId,
      metrics.date,
      metrics.fatigueScore,
      metrics.recoveryScore,
      metrics.performanceTrend,
      metrics.injuryRisk,
      metrics.rawData || null,
    ]);
  }

  async updateMuscleRecovery(records: MuscleRecoveryRecord[]): Promise<void> {
    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');
      for (const record of records) {
        const query = `
          INSERT INTO muscle_recovery (user_id, muscle_group, last_trained_date, recovery_percentage)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id, muscle_group)
          DO UPDATE SET
            last_trained_date = EXCLUDED.last_trained_date,
            recovery_percentage = EXCLUDED.recovery_percentage
        `;
        await client.query(query, [
          record.userId,
          record.muscleGroup,
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
    const query = 'SELECT * FROM muscle_recovery WHERE user_id = $1';
    const result = await this.database.query(query, [userId]);
    return result.rows.map((row: any) => ({
      userId: row.user_id,
      muscleGroup: row.muscle_group,
      lastTrainedDate: row.last_trained_date,
      recoveryPercentage: row.recovery_percentage,
    }));
  }
}