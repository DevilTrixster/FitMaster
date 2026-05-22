import { Client } from 'pg';
import dotenv from 'dotenv';

// dotenv ищет .env в корне проекта, откуда запускается скрипт (cwd)
dotenv.config();

async function resetDatabase() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('DROP SCHEMA public CASCADE');
    await client.query('CREATE SCHEMA public');
    console.log('Схема public успешно сброшена.');
  } finally {
    await client.end();
  }
}

resetDatabase().catch(console.error);