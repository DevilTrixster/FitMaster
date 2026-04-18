import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Database } from './infrastructure/database/Database';
import { UserRepository } from './infrastructure/repositories/UserRepository';
import { WorkoutRepository } from './infrastructure/repositories/WorkoutRepository';
import { AuthService } from './application/services/AuthService';
import { WorkoutService } from './application/services/WorkoutService';
import { WorkoutRescheduleService } from './application/services/WorkoutRescheduleService'; // ✅ 1. Импортируем
import { AuthController } from './presentation/controllers/AuthController';
import { WorkoutController } from './presentation/controllers/WorkoutController';
import { createAuthRoutes } from './presentation/routes/authRoutes';
import { createWorkoutRoutes } from './presentation/routes/workoutRoutes';
import { createAuthMiddleware } from './presentation/middleware/authMiddleware';
import { WorkoutSocketHandler } from './presentation/socket/WorkoutSocketHandler';
import { config } from './config/env';

async function bootstrap() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  // 1. Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '../public')));

  // 2. Инициализация БД и зависимостей
  try {
    const database = Database.getInstance();
    await database.connect();
    
    const userRepository = new UserRepository(database.getPool());
    const workoutRepository = new WorkoutRepository(database.getPool());

    const workoutService = new WorkoutService(workoutRepository, userRepository);
    const rescheduleService = new WorkoutRescheduleService(workoutRepository); // ✅ 2. Создаём сервис
    const authService = new AuthService(userRepository, workoutRepository);

    const authController = new AuthController(authService);
    const workoutController = new WorkoutController(workoutService, rescheduleService); // ✅ 3. Передаём в контроллер

    const authMiddleware = createAuthMiddleware(authService);

    // 3. Socket.IO
    const socketHandler = new WorkoutSocketHandler(io, workoutService);
    socketHandler.initialize();

    // 4. API маршруты
    app.use('/api/auth', createAuthRoutes(authController));
    app.use('/api/workouts', createWorkoutRoutes(workoutController, authMiddleware));

    app.get('/api/profile', authMiddleware, (req, res) => {
      res.json({ message: 'Профиль защищён', userId: (req as any).userId });
    });

    // 5. Frontend маршруты (оставляем как есть)
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
    app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, '../public/dashboard.html')));
    app.get('/history', (req, res) => res.sendFile(path.join(__dirname, '../public/history.html')));
    app.get('/workout', (req, res) => res.sendFile(path.join(__dirname, '../public/workout.html')));
    app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../public/auth/login.html')));
    app.get('/register', (req, res) => res.sendFile(path.join(__dirname, '../public/auth/register.html')));

    console.log('🚀 Сервер готов к работе');

    httpServer.listen(config.server.port, () => {
      console.log(`🌐 Сервер запущен на порту ${config.server.port}`);
      console.log(`📍 Главная: http://localhost:${config.server.port}/`);
      console.log(`📍 Личный кабинет: http://localhost:${config.server.port}/dashboard`);
      console.log(`📍 Вход: http://localhost:${config.server.port}/login`);
      console.log(`🔌 Socket.IO готов`);
    });
  } catch (error) {
    console.error('❌ Ошибка запуска сервера:', error);
    process.exit(1);
  }
}

bootstrap();