import { services } from './services';
import { AuthController } from '../presentation/controllers/AuthController';
import { WorkoutController } from '../presentation/controllers/WorkoutController';
import { ProgressController } from '../presentation/controllers/ProgressController';
import { ProfileController } from '../presentation/controllers/ProfileController';
import { LikeController } from '../presentation/controllers/LikeController';
import { AnalyticsController } from '../presentation/controllers/AnalyticsController';

// Вызов всех контроллеров зависящих от сервисов, репозиториев и друг друга

// Аутентификация
export const authController = new AuthController(services.authService);

// Тренировки
export const workoutController = new WorkoutController(
    services.workoutService, 
    services.rescheduleService);

// Прогресс    
export const progressController = new ProgressController(services.progressService);

// Профиль
export const profileController = new ProfileController(services.profileService);

// Лайки
export const likeController = new LikeController(services.exerciseLikeService);

// Аналитика
export const analyticsController = new AnalyticsController(
    services.fatigueService, 
    services.workoutService, 
    services.recommendationService);


// Единый объект для вызова всех контроллеров
export const controllers = {
    authController,
    workoutController,
    progressController,
    profileController,
    likeController,
    analyticsController,
};