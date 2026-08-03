import { Pool, QueryResult } from 'pg';
import { config } from '../config/env';

export class Database {
    private pool: Pool;

    // Публичный конструктор
    constructor(dbConfig: {
        host: string;
        port: number;
        user: string;
        password: string;
        database: string;
    }){
        // Пул соединения с файлом env-конфигурацией
        this.pool = new Pool({
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            password: dbConfig.password,
            database: dbConfig.database,
            max: 20, // максимальное одновременное количество подключенией
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
    }

    // Внутренний метод для получения пула (будет использоваться репозиториями -- в теории не нужен но пусть останется)
    public getPool(): Pool {
        return this.pool;
    }

    // Публичный метод для выполнения запросов (обёртка над pool.query)
    public async query(text: string, params?: any[]): Promise<QueryResult> {
        const client = await this.pool.connect();
        try {
            const result = await client.query(text, params);
            return result; // result имеет тип QueryResult<any>
        } finally {
            client.release();
        }
    }


    // Проверка подключение БД
    public async connect(): Promise<void> {
        try {
            const client = await this.pool.connect();
            console.log('✅ Успешное подключение к базе данных [database.ts]');
            client.release();
        } catch(error) {
            console.error('❌ Ошибка подключения к базе данных:', error, '[database.ts]');
            throw error;
        }
    }

    // Метод закрытия подключения к БД
    public async close(): Promise<void> {
        await this.pool.end();
        console.log('🔌 Подключение к базе данных закрыто [database.ts]');
    }
}

// Единый и единственный вызов БД
export const database = new Database(config.database);