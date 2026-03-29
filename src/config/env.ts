import dotenv from 'dotenv';
dotenv.config();

export const config = {
  server: {
    port: Number(process.env.PORT) || 3000,
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fitmaster_db',
  },
};