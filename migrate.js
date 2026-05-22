const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  databaseUrl: process.env.DATABASE_URL,
  migrationsTable: 'pgmigrations',   // таблица для хранения выполненных миграций
  dir: 'migrations',                 // папка с файлами миграций
  direction: 'up',
  count: Infinity,
  // Для TypeScript-миграций подключаем tsx
  migrationFileLanguage: 'ts',
  tsconfig: 'tsconfig.json',
  // если используешь tsx, нужно передать команду запуска
  exec: 'tsx',
};