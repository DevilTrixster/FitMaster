import { Router } from 'express';
import { controllers } from './controllers';
import { authMiddleware } from './middleware';
import { createAuthRoutes } from '../presentation/routes/authRoutes';
import { createWorkoutRoutes } from '../presentation/routes/workout.routes';
import { createExerciseRoutes } from '../presentation/routes/exercise.routes';
import { createProgressRoutes } from '../presentation/routes/progressRoutes';
import { createProfileRoutes } from '../presentation/routes/profileRoutes';
import { createLikeRoutes } from '../presentation/routes/likeRoutes';
import { createAnalyticsRoutes } from '../presentation/routes/analyticsRoutes';
import { createWorkoutHistoryRoutes } from '../presentation/routes/workout-history.routes';
import { createWorkoutCalendarRoutes } from '../presentation/routes/workout-calendar.routes';
import { createDashboardRoutes } from '../presentation/routes/dashboard.routes'
import { createWorkoutScheduleRoutes } from '../presentation/routes/workout-schedule.routes';

// Все маршруты собираются здесь, получая уже готовые зависимости
const authRoutes = createAuthRoutes(controllers.authController);
const workoutRoutes = createWorkoutRoutes(controllers.workoutController, authMiddleware);
const exerciseRoutes = createExerciseRoutes(controllers.exerciseController, authMiddleware);
const workoutHistoryRoutes = createWorkoutHistoryRoutes(controllers.workoutHistoryController, authMiddleware);
const workoutCalendarRoutes = createWorkoutCalendarRoutes(controllers.workoutCalendarController, authMiddleware);
const workoutScheduleRoutes = createWorkoutScheduleRoutes(controllers.workoutScheduleController, authMiddleware);
const dashboardRoutes = createDashboardRoutes(controllers.workoutDashboardController, authMiddleware);
const progressRoutes = createProgressRoutes(controllers.progressController, authMiddleware);
const profileRoutes = createProfileRoutes(controllers.profileController, authMiddleware);
const likeRoutes = createLikeRoutes(controllers.likeController, authMiddleware);
const analyticsRoutes = createAnalyticsRoutes(controllers.analyticsController, authMiddleware);

// Функция которая будет вызывать пути за раз
export const routes = (app: Router) => {
    // Авторизация
    app.use('/api/auth', authRoutes);
    // Тренировка
    app.use('/api/workouts', workoutRoutes);
    app.use('/api/workouts', workoutHistoryRoutes);
    app.use('/api/workouts', workoutCalendarRoutes);
    app.use('/api/workouts', workoutScheduleRoutes);
    app.use('/api/workouts', dashboardRoutes);
    // Упражнения
    app.use('/api/exercises', exerciseRoutes);
    // Прогресс
    app.use('/api/progress', progressRoutes);
    // Профиль
    app.use('/api/profile', profileRoutes);
    // Лайки
    app.use('/api/likes', likeRoutes);
    // Аналитика
    app.use('/api/analytics', analyticsRoutes);

};