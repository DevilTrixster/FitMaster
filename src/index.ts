import express from 'express';
import 'reflect-metadata';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config/env';
import { container } from './injection/container';
import { WorkoutSocketHandler } from './presentation/socket/WorkoutSocketHandler';
import { errorHandler } from './presentation/middleware/errorHandler'; 

async function bootstrap() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: ["http://localhost:3000", "https://fitmaster.ru"], methods: ['GET', 'POST'] },
  });

  app.use(cors());
  app.use((req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    if (contentType.startsWith('multipart/form-data')) {
      return next();
    }
    express.json({ limit: '5mb' })(req, res, next);
  });
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));
  app.use(express.static(path.join(__dirname, '../public')));

  // Вызов всего из контейнера (всех сервисов, репозиториев, маршрутов и т.д.)
  await container.initialize();

  // WebSocket
  const socketHandler = new WorkoutSocketHandler(io, container.services.workoutService);
  socketHandler.initialize();

  // Вызов всех маршрутов
  container.routes(app);

  // HTML-страницы
  app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
  app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, '../public/dashboard.html')));
  app.get('/history', (req, res) => res.sendFile(path.join(__dirname, '../public/history.html')));
  app.get('/workout', (req, res) => res.sendFile(path.join(__dirname, '../public/workout.html')));
  app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../public/auth/login.html')));
  app.get('/register', (req, res) => res.sendFile(path.join(__dirname, '../public/auth/register.html')));
  app.get('/progress', (req, res) => res.sendFile(path.join(__dirname, '../public/progress.html')));
  app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, '../public/profile.html')));

  console.log('🚀 Сервер готов к работе');

  // Централизованный стек ошибок
  app.use(errorHandler);

  const server = httpServer.listen(config.server.port, () => {
    console.log(`🌐 Сервер запущен на порту ${config.server.port}`);
    console.log(`📍 Главная: http://localhost:${config.server.port}/`);
    console.log(`🔌 Socket.IO готов`);
  });

  // Shutdown
  process.on('SIGTERM', async () => {
    console.log('🛑 Получен SIGTERM, принудительное завершение работы...');
    await container.dispose();
    server.close();
    process.exit(0);
  })
}

bootstrap().catch((error) => {
  console.error('❌ Ошибка запуска:', error);
  process.exit(1);
});