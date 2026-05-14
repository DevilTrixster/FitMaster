import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Database } from './infrastructure/database/Database';
import { UserRepository } from './infrastructure/repositories/UserRepository';
import { WorkoutRepository } from './infrastructure/repositories/WorkoutRepository';
import { AuthService } from './application/services/AuthService';
import { ExerciseLikeRepository } from './infrastructure/repositories/ExerciseLikeRepository';
import { ExerciseLikeService } from './application/services/ExerciseLikeService';
import { LikeController } from './presentation/controllers/LikeController';
import { createLikeRoutes } from './presentation/routes/likeRoutes';
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
import { WorkoutSocketHandler } from './presentation/socket/WorkoutSocketHandler';
import { ProfileController } from './presentation/controllers/ProfileController';
import { ProfileService } from './application/services/ProfileService';
import { createProfileRoutes } from './presentation/routes/profileRoutes';
import { WorkoutSchedulingService, WorkoutLifecycleService, WorkoutQueryService, WorkoutResultsService } from './application/services/workout';
import { config } from './config/env';
import { errorHandler } from './presentation/middleware/errorHandler';
import { IntelligentAdaptationService } from './application/services/adaptation/IntelligentAdaptationService';
import { FatigueRecoveryService } from './application/services/adaptation/FatigueRecoveryService';
import { FatigueRepository } from './infrastructure/repositories/FatigueRepository';
import { PlateauDetectionService } from './application/services/adaptation/PlateauDetectionService';
import { createAnalyticsRoutes } from './presentation/routes/analyticsRoutes';
import { AnalyticsController } from './presentation/controllers/AnalyticsController';

async function bootstrap() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  // Middleware
  app.use(cors());

  // Middleware для пропуска парсинга тела multipart запросов
  app.use((req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    if (contentType.startsWith('multipart/form-data')) {
      return next();
    }
    express.json({ limit: '5mb' })(req, res, next);
  });
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));
  app.use(express.static(path.join(__dirname, '../public')));

  try {
    const database = Database.getInstance();
    await database.connect();

    // === Репозитории ===
    const userRepository = new UserRepository(database.getPool());
    const workoutRepository = new WorkoutRepository(database.getPool());
    const progressRepository = new ProgressRepository(database.getPool());
    const fatigueRepository = new FatigueRepository(database.getPool());

    // === Сервисы ===
    // Сервис утомления/восстановления
    const fatigueService = new FatigueRecoveryService(workoutRepository, fatigueRepository);

    // Сервис обнаружения плато
    const plateauService = new PlateauDetectionService(workoutRepository);

    // Интеллектуальная адаптация
    const intelligentAdaptationService = new IntelligentAdaptationService(
      workoutRepository,
      userRepository,
      fatigueService,
      plateauService
    );

    // Сервисы тренировок (единственное объявление WorkoutSchedulingService)
    const workoutSchedulingService = new WorkoutSchedulingService(workoutRepository, userRepository);

    const workoutResultsService = new WorkoutResultsService(
      workoutRepository,
      userRepository,
      intelligentAdaptationService,
      fatigueService
    );

    const workoutLifecycleService = new WorkoutLifecycleService(workoutRepository, workoutResultsService);
    const workoutQueryService = new WorkoutQueryService(workoutRepository, workoutSchedulingService);

    // Главный фасад WorkoutService
    const workoutService = new WorkoutService(
      workoutSchedulingService,
      workoutLifecycleService,
      workoutQueryService,
      workoutResultsService,
      workoutRepository);

    // ProfileService теперь получает workoutSchedulingService
    const profileService = new ProfileService(userRepository, workoutRepository, workoutSchedulingService);
    const profileController = new ProfileController(profileService);

    const rescheduleService = new WorkoutRescheduleService(workoutRepository);
    const progressService = new ProgressAnalyticsService(progressRepository);
    const authService = new AuthService(userRepository, workoutService);

    // Контроллеры
    const authController = new AuthController(authService);
    const workoutController = new WorkoutController(workoutService, rescheduleService);
    const progressController = new ProgressController(progressService);

    // Middleware
    const authMiddleware = createAuthMiddleware(authService);

    // Лайки упражнений
    const exerciseLikeRepository = new ExerciseLikeRepository(database.getPool());
    const exerciseLikeService = new ExerciseLikeService(exerciseLikeRepository);
    const likeController = new LikeController(exerciseLikeService);

    // Socket.IO
    const socketHandler = new WorkoutSocketHandler(io, workoutService);
    socketHandler.initialize();

    // Аналитика
    const analyticsController = new AnalyticsController(fatigueService, workoutService);

    // API маршруты
    app.use('/api/auth', createAuthRoutes(authController));
    app.use('/api/workouts', createWorkoutRoutes(workoutController, authMiddleware));
    app.use('/api/progress', createProgressRoutes(progressController, authMiddleware));
    app.use('/api/profile', createProfileRoutes(profileController, authMiddleware));
    app.use('/api/likes', createLikeRoutes(likeController, authMiddleware));
    app.use('/api/analytics', createAnalyticsRoutes(analyticsController, authMiddleware));

    // Frontend
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
    app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, '../public/dashboard.html')));
    app.get('/history', (req, res) => res.sendFile(path.join(__dirname, '../public/history.html')));
    app.get('/workout', (req, res) => res.sendFile(path.join(__dirname, '../public/workout.html')));
    app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../public/auth/login.html')));
    app.get('/register', (req, res) => res.sendFile(path.join(__dirname, '../public/auth/register.html')));
    app.get('/progress', (req, res) => res.sendFile(path.join(__dirname, '../public/progress.html')));
    app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, '../public/profile.html')));

    app.use(errorHandler);

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