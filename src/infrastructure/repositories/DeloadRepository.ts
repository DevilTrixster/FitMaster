import { IDeloadRepository, IDeloadPeriod } from '../../domain/interfaces/IDeloadRepository';
import { Database } from '../../injection/database';

export class DeloadRepository implements IDeloadRepository {
  constructor(private database: Database) {}

  async getActiveDeload(userId: number): Promise<IDeloadPeriod | null> {
    const res = await this.database.query(
      `SELECT * FROM deload_periods WHERE user_id = $1 AND end_date IS NULL ORDER BY start_date DESC LIMIT 1`,
      [userId]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      startDate: row.start_date,
      endDate: row.end_date,
      intensityFactor: row.intensity_factor,
      reason: row.reason,
    };
  }

  async startDeload(userId: number, reason: string, intensityFactor: number = 0.6): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    await this.database.query(
      `INSERT INTO deload_periods (user_id, start_date, intensity_factor, reason) VALUES ($1, $2, $3, $4)`,
      [userId, today, intensityFactor, reason]
    );
  }

  async endDeload(userId: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    await this.database.query(
      `UPDATE deload_periods SET end_date = $1 WHERE user_id = $2 AND end_date IS NULL`,
      [today, userId]
    );
  }
}