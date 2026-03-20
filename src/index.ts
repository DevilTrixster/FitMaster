// src/index.ts
import express from 'express';
import cors from 'cors';
import path from 'path';
import { Database } from './infrastructure/database/Database';
import { UserRepository } from './infrastructure/repositories/UserRepository';
import { AuthService } from './application/services/AuthService';
import { AuthController } from './interface/controllers/AuthController';
import { createAuthRoutes } from './interface/routes/authRoutes';
import { createAuthMiddleware } from './interface/middleware/authMiddleware';
import { config } from './config/env';

async function bootstrap() {
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '../public')));

  try {
    // Инициализация БД
    const database = Database.getInstance();
    await database.connect();

    // Создание зависимостей (Dependency Injection)
    const userRepository = new UserRepository(database.getPool());
    const authService = new AuthService(userRepository);
    const authController = new AuthController(authService);
    const authMiddleware = createAuthMiddleware(authService);

    // Подключение маршрутов
    app.use('/api/auth', createAuthRoutes(authController));

    // Пример защищённого маршрута
    app.get('/api/profile', authMiddleware, (req, res) => {
      res.json({ message: 'Это защищённый маршрут', userId: (req as any).userId });
    });

    // Главная страница (frontend)
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });

    console.log('🚀 Сервер готов к работе');

    app.listen(config.server.port, () => {
      console.log(`🌐 Сервер запущен на порту ${config.server.port}`);
      console.log(`📍 Регистрация: http://localhost:${config.server.port}/register.html`);
      console.log(`📍 Вход: http://localhost:${config.server.port}/login.html`);
    });

  } catch (error) {
    console.error('❌ Ошибка запуска сервера:', error);
    process.exit(1);
  }
}

bootstrap();