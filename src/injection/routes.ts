import { Router } from 'express';
import { controllers } from './controllers';
import { authMiddleware } from './middleware';
import { createAuthRoutes } from '../presentation/routes/authRoutes';
import { createWorkoutRoutes } from '../presentation/routes/workoutRoutes';
import { createProgressRoutes } from '../presentation/routes/progressRoutes';
import { createProfileRoutes } from '../presentation/routes/profileRoutes';
import { createLikeRoutes } from '../presentation/routes/likeRoutes';
import { createAnalyticsRoutes } from '../presentation/routes/analyticsRoutes';

// Все маршруты собираются здесь, получая уже готовые зависимости
const authRoutes = createAuthRoutes(controllers.authController);
const workoutRoutes = createWorkoutRoutes(controllers.workoutController, authMiddleware);
const progressRoutes = createProgressRoutes(controllers.progressController, authMiddleware);
const profileRoutes = createProfileRoutes(controllers.profileController, authMiddleware);
const likeRoutes = createLikeRoutes(controllers.likeController, authMiddleware);
const analyticsRoutes = createAnalyticsRoutes(controllers.analyticsController, authMiddleware);

// Функция которая будет вызывать пути за раз
export const routes = (app: Router) => {
    app.use('/api/auth', authRoutes);
    app.use('/api/workouts', workoutRoutes);
    app.use('/api/progress', progressRoutes);
    app.use('/api/profile', profileRoutes);
    app.use('/api/likes', likeRoutes);
    app.use('/api/analytics', analyticsRoutes);
};