
import { User, Gender, ExperienceLevel, FitnessGoal } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { Database } from '../../injection/database';
import { injectable, inject } from 'tsyringe';

export class UserRepository implements IUserRepository {
  constructor(private database: Database) {}

  // Создаёт нового пользователя в БД.
  async createUser(user: User): Promise<User> {
    const query = `
      INSERT INTO users (
        nickname, password, email, first_name, last_name, birth_date,
        gender, height, weight, preferred_workout_time,
        experience_level, fitness_goal
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, created_at;
    `;
    const values = [
      user.nickname,
      user.password,
      user.email,
      user.firstName,
      user.lastName,
      user.birthDate,
      user.gender,
      user.height,
      user.weight,
      user.preferredWorkoutTime || null,
      user.experienceLevel,
      user.fitnessGoal,
    ];

    const result = await this.database.query(query, values);
    return new User({
      ...user,
      id: result.rows[0].id,
      createdAt: result.rows[0].created_at,
    });
  }

  // Поиск пользователя по email.
  async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await this.database.query(query, [email]);
    if (result.rows.length === 0) return null;
    return this.mapRowToUser(result.rows[0]);
  }

  // Поиск пользователя по никнейму.
  async findByNickname(nickname: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE nickname = $1';
    const result = await this.database.query(query, [nickname]);
    if (result.rows.length === 0) return null;
    return this.mapRowToUser(result.rows[0]);
  }

  // Поиск пользователя по ID.
  async findById(id: number): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await this.database.query(query, [id]);
    if (result.rows.length === 0) return null;
    return this.mapRowToUser(result.rows[0]);
  }

  // Обновляет полный объект пользователя (устаревший метод, рекомендуется updateUserFields).
  async updateUser(user: User): Promise<void> {
    const query = `
      UPDATE users SET
        nickname = $1,
        first_name = $2,
        last_name = $3,
        height = $4,
        weight = $5,
        experience_level = $6,
        fitness_goal = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
    `;
    const values = [
      user.nickname,
      user.firstName,
      user.lastName,
      user.height,
      user.weight,
      user.experienceLevel,
      user.fitnessGoal,
      user.id,
    ];
    await this.database.query(query, values);
  }

  // Частичное обновление полей пользователя.
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
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (fields.nickname !== undefined) {
      updates.push(`nickname = $${paramIndex}`);
      values.push(fields.nickname);
      paramIndex++;
    }
    if (fields.firstName !== undefined) {
      updates.push(`first_name = $${paramIndex}`);
      values.push(fields.firstName);
      paramIndex++;
    }
    if (fields.lastName !== undefined) {
      updates.push(`last_name = $${paramIndex}`);
      values.push(fields.lastName);
      paramIndex++;
    }
    if (fields.height !== undefined) {
      updates.push(`height = $${paramIndex}`);
      values.push(fields.height);
      paramIndex++;
    }
    if (fields.weight !== undefined) {
      updates.push(`weight = $${paramIndex}`);
      values.push(fields.weight);
      paramIndex++;
    }
    if (fields.experienceLevel !== undefined) {
      updates.push(`experience_level = $${paramIndex}`);
      values.push(fields.experienceLevel);
      paramIndex++;
    }
    if (fields.fitnessGoal !== undefined) {
      updates.push(`fitness_goal = $${paramIndex}`);
      values.push(fields.fitnessGoal);
      paramIndex++;
    }

    if (updates.length === 0) return;

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
    await this.database.query(query, values);
  }

  // Обновляет URL аватара пользователя.
  async updateAvatar(userId: number, avatarUrl: string): Promise<void> {
    const query = `UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
    const result = await this.database.query(query, [avatarUrl, userId]);
    if (result.rowCount === 0) {
      throw new Error('Пользователь не найден');
    }
  }

  // Сохраняет предпочтительные дни недели для тренировок.
  async updatePreferredDays(userId: number, days: number[]): Promise<void> {
    console.log(`💾 Updating preferred_days for user ${userId} to:`, days);
    const query = `UPDATE users SET preferred_days = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
    await this.database.query(query, [days, userId]);
    const check = await this.database.query(`SELECT preferred_days FROM users WHERE id = $1`, [userId]);
    console.log(`✅ After update, DB contains:`, check.rows[0]?.preferred_days);
  }

  // Возвращает предпочтительные дни тренировок пользователя.
  async getPreferredDays(userId: number): Promise<number[]> {
    const res = await this.database.query(`SELECT preferred_days FROM users WHERE id = $1`, [userId]);
    if (res.rows.length === 0) return [1, 3, 5];
    const days = res.rows[0].preferred_days;
    return days || [1, 3, 5];
  }

  // Преобразует строку результата SQL-запроса в объект User.
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