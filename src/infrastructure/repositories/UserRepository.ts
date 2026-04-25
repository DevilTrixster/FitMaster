import { Pool } from 'pg';
import { User, Gender } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';

export class UserRepository implements IUserRepository {
  // Зависимость внедряется через конструктор
  constructor(private pool: Pool) {}

  async createUser(user: User): Promise<User> {
    const query = `
      INSERT INTO users (nickname, password, email, first_name, last_name, birth_date, gender, height, weight)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
    ];

    const result = await this.pool.query(query, values);
    
    // Возвращаем новый объект User с ID и датой создания из БД
    return new User({
      ...user,
      id: result.rows[0].id,
      createdAt: result.rows[0].created_at,
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await this.pool.query(query, [email]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  async findByNickname(nickname: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE nickname = $1';
    const result = await this.pool.query(query, [nickname]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  async findById(id: number): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  // Приватный метод для маппинга данных из БД в Сущность (Data Mapper)
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
      createdAt: row.created_at,
    });
  }

  async updateUser(user: User): Promise<void> {
  const query = `
    UPDATE users SET 
      nickname = $1, 
      first_name = $2, 
      last_name = $3, 
      height = $4, 
      weight = $5,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
  `;
  const values = [
    user.nickname,
    user.firstName,
    user.lastName,
    user.height,
    user.weight,
    user.id
  ];
  await this.pool.query(query, values);
  }

  async updateUserFields(userId: number, fields: {
    nickname?: string;
    firstName?: string;
    lastName?: string;
    height?: number;
    weight?: number;
  }): Promise<void> {
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

    if (updates.length === 0) return;

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
    await this.pool.query(query, values);
  }
}