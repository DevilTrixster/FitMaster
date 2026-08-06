import { User, Gender, ExperienceLevel, FitnessGoal } from '../../domain/entities/User';
import { bquery } from './bquery';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { Database } from '../../injection/database';

export class UserRepository implements IUserRepository {
  constructor(private database: Database) {}

  // Создаёт нового пользователя (транзакционно: users + profile + settings + preferences)
  async createUser(user: User): Promise<User> {
    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');

      // 1. Пользователь (базовая запись)
      const userRes = await client.query(
        `INSERT INTO users (nickname, password, email)
         VALUES ($1, $2, $3)
         RETURNING id, created_at`,
        [user.nickname, user.password, user.email]
      );
      const userId = userRes.rows[0].id;
      const createdAt = userRes.rows[0].created_at;

      // 2. Профиль
      await client.query(
        `INSERT INTO user_profiles (user_id, first_name, last_name, birth_date, gender, height, weight, avatar_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, user.firstName, user.lastName, user.birthDate, user.gender,
         user.height, user.weight, null]
      );

      // 3. Настройки
      await client.query(
        `INSERT INTO user_settings (user_id, preferred_workout_time, preferred_days)
         VALUES ($1, $2, $3)`,
        [userId, user.preferredWorkoutTime || '17:00:00', user.preferredWorkoutTime ? [] : []]
      );

      // 4. Предпочтения (уровень и цель)
      await client.query(
        `INSERT INTO user_preferences (user_id, experience_level, fitness_goal)
         VALUES ($1, $2, $3)`,
        [userId, user.experienceLevel, user.fitnessGoal]
      );

      await client.query('COMMIT');

      return new User({
        ...user,
        id: userId,
        createdAt,
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // Поиск по email (с джойном всех трёх таблиц)
  async findByEmail(email: string): Promise<User | null> {
    const query = bquery.q_findByEmail;
    const result = await this.database.query(query, [email]);
    if (result.rows.length === 0) return null;
    return this.mapRowToUser(result.rows[0]);
  }

  // Найти по никнейму 
  async findByNickname(nickname: string): Promise<User | null> {
    const query = bquery.q_findByNickname;
    const result = await this.database.query(query, [nickname]);
    if (result.rows.length === 0) return null;
    return this.mapRowToUser(result.rows[0]);
  }

  // Найти по ид
  async findById(id: number): Promise<User | null> {
    const query = bquery.q_findById;
    const result = await this.database.query(query, [id]);
    if (result.rows.length === 0) return null;
    return this.mapRowToUser(result.rows[0]);
  }

  // Частичное обновление полей (nickname – в users, остальные – по соответствующим таблицам)
  async updateUserFields(
    userId: number,
    fields: {
      nickname?: string;
      firstName?: string;
      lastName?: string;
      height?: number;
      weight?: number;
      experienceLevel?: ExperienceLevel;
      fitnessGoal?: FitnessGoal;
    }
  ): Promise<void> {
    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');

      if (fields.nickname !== undefined) {
        await client.query(
          `UPDATE users SET nickname = $1 WHERE id = $2`,
          [fields.nickname, userId]
        );
      }

      const profileUpdates: string[] = [];
      const profileValues: any[] = [];
      if (fields.firstName !== undefined) {
        profileUpdates.push(`first_name = $${profileValues.length + 1}`);
        profileValues.push(fields.firstName);
      }
      if (fields.lastName !== undefined) {
        profileUpdates.push(`last_name = $${profileValues.length + 1}`);
        profileValues.push(fields.lastName);
      }
      if (fields.height !== undefined) {
        profileUpdates.push(`height = $${profileValues.length + 1}`);
        profileValues.push(fields.height);
      }
      if (fields.weight !== undefined) {
        profileUpdates.push(`weight = $${profileValues.length + 1}`);
        profileValues.push(fields.weight);
      }
      if (profileUpdates.length > 0) {
        profileValues.push(userId);
        await client.query(
          `UPDATE user_profiles SET ${profileUpdates.join(', ')} WHERE user_id = $${profileValues.length}`,
          profileValues
        );
      }

      if (fields.experienceLevel !== undefined || fields.fitnessGoal !== undefined) {
        const prefUpdates: string[] = [];
        const prefValues: any[] = [];
        if (fields.experienceLevel !== undefined) {
          prefUpdates.push(`experience_level = $${prefValues.length + 1}`);
          prefValues.push(fields.experienceLevel);
        }
        if (fields.fitnessGoal !== undefined) {
          prefUpdates.push(`fitness_goal = $${prefValues.length + 1}`);
          prefValues.push(fields.fitnessGoal);
        }
        prefValues.push(userId);
        await client.query(
          `UPDATE user_preferences SET ${prefUpdates.join(', ')} WHERE user_id = $${prefValues.length}`,
          prefValues
        );
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async updateAvatar(userId: number, avatarUrl: string): Promise<void> {
    // avatar_url теперь в user_profiles
    const query = `UPDATE user_profiles SET avatar_url = $1 WHERE user_id = $2`;
    const result = await this.database.query(query, [avatarUrl, userId]);
    if (result.rowCount === 0) {
      throw new Error('Пользователь не найден');
    }
  }

  async updatePreferredDays(userId: number, days: number[]): Promise<void> {
    console.log(`💾 Обновить preferred_days для пользователя ${userId} на:`, days, '[UserRepository.ts]');
    const query = `UPDATE user_settings SET preferred_days = $1 WHERE user_id = $2`;
    await this.database.query(query, [days, userId]);
    const check = await this.database.query(`SELECT preferred_days FROM user_settings WHERE user_id = $1`, [userId]);
    console.log(`✅ После обновления, DB содержит:`, check.rows[0]?.preferred_days, '[UserRepository.ts]');
  }

  async getPreferredDays(userId: number): Promise<number[]> {
    const res = await this.database.query(`SELECT preferred_days FROM user_settings WHERE user_id = $1`, [userId]);
    if (res.rows.length === 0) return [1, 3, 5];
    const days = res.rows[0].preferred_days;
    return days || [1, 3, 5];
  }

  private mapRowToUser(row: any): User {
    return new User({
      id: row.id,
      nickname: row.nickname,
      password: row.password,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      birthDate: row.birth_date,
      gender: row.gender as Gender,
      height: row.height,
      weight: row.weight,
      preferredWorkoutTime: row.preferred_workout_time,
      experienceLevel: row.experience_level as ExperienceLevel,
      fitnessGoal: row.fitness_goal as FitnessGoal,
      createdAt: row.created_at,
    });
  }

  async getAllUserIds(): Promise<number[]> {
    const res = await this.database.query('SELECT id FROM users');
    return res.rows.map(row => row.id);
  }
}