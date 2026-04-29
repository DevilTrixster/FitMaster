import { User } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { IWorkoutRepository } from '../../domain/interfaces/IWorkoutRepository';
import { Database } from '../../infrastructure/database/Database';

export class ProfileService {
  constructor(
    private userRepository: IUserRepository,
    private workoutRepository: IWorkoutRepository
  ) {}

  async getProfile(userId: number): Promise<User | null> {
    return await this.userRepository.findById(userId);
  }

  async updateProfile(
    userId: number,
    data: {
      nickname?: string;
      firstName?: string;
      lastName?: string;
      height?: number;
      weight?: number;
      preferredWorkoutTime?: string;
    }
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error('Пользователь не найден');

    // Обновляем через прямой SQL запрос
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.nickname !== undefined) {
      updates.push(`nickname = $${paramIndex++}`);
      values.push(data.nickname);
    }
    if (data.firstName !== undefined) {
      updates.push(`first_name = $${paramIndex++}`);
      values.push(data.firstName);
    }
    if (data.lastName !== undefined) {
      updates.push(`last_name = $${paramIndex++}`);
      values.push(data.lastName);
    }
    if (data.height !== undefined) {
      updates.push(`height = $${paramIndex++}`);
      values.push(data.height);
    }
    if (data.weight !== undefined) {
      updates.push(`weight = $${paramIndex++}`);
      values.push(data.weight);
    }
    if (data.preferredWorkoutTime !== undefined) {
      updates.push(`preferred_workout_time = $${paramIndex++}::time`);
      values.push(data.preferredWorkoutTime);
    }

    if (updates.length > 0) {
      values.push(userId);
      const query = `
        UPDATE users 
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex}
      `;
      
      // ПРАВИЛЬНЫЙ ИМПОРТ: получаем пул через getInstance().getPool()
      const db = Database.getInstance();
      const pool = db.getPool();
      await pool.query(query, values);
    }
  }

  // НОВЫЙ МЕТОД: Обновление времени всех будущих тренировок
  async updateFutureWorkoutsTime(userId: number, newTime: string): Promise<void> {
    const query = `
      UPDATE user_workouts
      SET scheduled_time = $1::time,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2
        AND status = 'scheduled'
        AND scheduled_date >= CURRENT_DATE
    `;

    // ПРАВИЛЬНЫЙ ИМПОРТ
    const db = Database.getInstance();
    const pool = db.getPool();
    await pool.query(query, [newTime, userId]);

    console.log(`⏰ Обновлено время тренировок для пользователя ${userId}: ${newTime}`);
  }
}