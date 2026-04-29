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
import { WorkoutRescheduleService } from './application/services/WorkoutRescheduleService';
import { ProgressRepository } from './infrastructure/repositories/ProgressRepository';
import { ProgressAnalyticsService } from './application/services/ProgressAnalyticsService';
import { AuthController } from './presentation/controllers/AuthController';
import { WorkoutController } from './presentation/controllers/WorkoutController';
import { ProgressController } from './presentation/controllers/ProgressController';
import { createAuthRoutes } from './presentation/routes/authRoutes';
import { createWorkoutRoutes } from './presentation/routes/workoutRoutes';
import { createProgressRoutes } from './presentation/routes/progressRoutes';
import { createAuthMiddleware } from './presentation/middleware/authMiddleware';
import { SubstitutionController } from './presentation/controllers/SubstitutionController';
import { createSubstitutionRoutes } from './presentation/routes/substitutionRoutes';
import { WorkoutSocketHandler } from './presentation/socket/WorkoutSocketHandler';
import { ProfileController } from './presentation/controllers/ProfileController';
import { ProfileService } from './application/services/ProfileService';
import { createProfileRoutes } from './presentation/routes/profileRoutes';
import { WorkoutAdaptationService } from './application/services/WorkoutAdaptationService';
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
    
    // Репозитории
    const userRepository = new UserRepository(database.getPool());
    const workoutRepository = new WorkoutRepository(database.getPool());
    const progressRepository = new ProgressRepository(database.getPool());
    

    // Сервисы
    const profileService = new ProfileService(userRepository, workoutRepository);
    const profileController = new ProfileController(profileService);
    const workoutAdaptationService = new WorkoutAdaptationService(workoutRepository, userRepository);
    const workoutService = new WorkoutService(workoutRepository, userRepository, workoutAdaptationService);
    const rescheduleService = new WorkoutRescheduleService(workoutRepository);
    const progressService = new ProgressAnalyticsService(progressRepository);
    const authService = new AuthService(userRepository, workoutRepository);
    const substitutionController = new SubstitutionController(workoutService);

    // Контроллеры
    const authController = new AuthController(authService);
    const workoutController = new WorkoutController(workoutService, rescheduleService);
    const progressController = new ProgressController(progressService);

    // Middleware
    const authMiddleware = createAuthMiddleware(authService);

    // 3. Socket.IO
    const socketHandler = new WorkoutSocketHandler(io, workoutService);
    socketHandler.initialize();

    // 4. API маршруты
    app.use('/api/auth', createAuthRoutes(authController));
    app.use('/api/workouts', createWorkoutRoutes(workoutController, authMiddleware));
    app.use('/api/progress', createProgressRoutes(progressController, authMiddleware));
    app.use('/api/profile', createProfileRoutes(profileController, authMiddleware));
    app.use('/api/substitutions', createSubstitutionRoutes(substitutionController, authMiddleware));

    // 5. Frontend маршруты
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
    app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, '../public/dashboard.html')));
    app.get('/history', (req, res) => res.sendFile(path.join(__dirname, '../public/history.html')));
    app.get('/workout', (req, res) => res.sendFile(path.join(__dirname, '../public/workout.html')));
    app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../public/auth/login.html')));
    app.get('/register', (req, res) => res.sendFile(path.join(__dirname, '../public/auth/register.html')));
    app.get('/progress', (req, res) => res.sendFile(path.join(__dirname, '../public/progress.html')));
    app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, '../public/profile.html')));
    app.get('/suggestions', (req, res) => res.sendFile(path.join(__dirname, '../public/suggestions.html')));

    console.log('🚀 Сервер готов к работе');

    httpServer.listen(config.server.port, () => {
      console.log(`🌐 Сервер запущен на порту ${config.server.port}`);
      console.log(`📍 Главная: http://localhost:${config.server.port}/`);
      console.log(`🔌 Socket.IO готов`);
    });
  } catch (error) {
    console.error('❌ Ошибка запуска сервера:', error);
    process.exit(1);
  }
}

bootstrap();