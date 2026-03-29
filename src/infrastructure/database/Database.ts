import { Pool } from 'pg';
import { config } from '../../config/env';

export class Database {
  private static instance: Database;
  private pool: Pool;

  private constructor() {
    // Создаем пул соединений с настройками из конфига
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
      max: 20, // Максимум 20 одновременных подключений в пуле
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  // Метод для получения единственного экземпляра (Singleton)
  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  // Метод для получения пула (используется репозиториями)
  public getPool(): Pool {
    return this.pool;
  }

  // Метод для проверки подключения
  public async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      console.log('✅ Успешное подключение к базе данных');
      client.release();
    } catch (error) {
      console.error('❌ Ошибка подключения к базе данных:', error);
      throw error;
    }
  }

  // Метод для закрытия подключения (при остановке сервера)
  public async close(): Promise<void> {
    await this.pool.end();
    console.log('🔌 Подключение к базе данных закрыто');
  }
}