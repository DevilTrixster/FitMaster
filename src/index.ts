import express from 'express';
import cors from 'cors';
import path from 'path';
import { Database } from './infrastructure/database/Database';
import { UserRepository } from './infrastructure/repositories/UserRepository';
import { WorkoutRepository } from './infrastructure/repositories/WorkoutRepository';
import { AuthService } from './application/services/AuthService';
import { WorkoutService } from './application/services/WorkoutService';
import { AuthController } from './interface/controllers/AuthController';
import { WorkoutController } from './interface/controllers/WorkoutController';
import { createAuthRoutes } from './interface/routes/authRoutes';
import { createWorkoutRoutes } from './interface/routes/workoutRoutes';
import { createAuthMiddleware } from './interface/middleware/authMiddleware';
import { config } from './config/env';

async function bootstrap() {
  const app = express();
  
  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '../public')));

  try {
    const database = Database.getInstance();
    await database.connect();

    // Репозитории
    const userRepository = new UserRepository(database.getPool());
    const workoutRepository = new WorkoutRepository(database.getPool());
    
    // Сервисы (с внедрением зависимостей)
    const workoutService = new WorkoutService(workoutRepository, userRepository);
    const authService = new AuthService(userRepository, workoutRepository);
    
    // Контроллеры
    const authController = new AuthController(authService);
    const workoutController = new WorkoutController(workoutService);
    
    const authMiddleware = createAuthMiddleware(authService);

    // Маршруты
    app.use('/api/auth', createAuthRoutes(authController));
    app.use('/api/workouts', createWorkoutRoutes(workoutController, authMiddleware));

    app.get('/api/profile', authMiddleware, (req, res) => {
      res.json({ message: 'Это защищённый маршрут', userId: (req as any).userId });
    });

    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });
    
    app.get('/dashboard', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/dashboard.html'));
    });

    console.log('🚀 Сервер готов к работе');

    app.listen(config.server.port, () => {
      console.log(`🌐 Сервер запущен на порту ${config.server.port}`);
      console.log(`📍 Главная: http://localhost:${config.server.port}/`);
      console.log(`📍 Личный кабинет: http://localhost:${config.server.port}/dashboard`);
    });

  } catch (error) {
    console.error('❌ Ошибка запуска сервера:', error);
    process.exit(1);
  }
}

bootstrap();