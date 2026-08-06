import { services } from './services';
import { AuthController } from '../presentation/controllers/AuthController';
import { WorkoutController } from '../presentation/controllers/workout/WorkoutController';
import { ProgressController } from '../presentation/controllers/ProgressController';
import { ProfileController } from '../presentation/controllers/ProfileController';
import { LikeController } from '../presentation/controllers/LikeController';
import { AnalyticsController } from '../presentation/controllers/AnalyticsController';
import { ExerciseController } from '../presentation/controllers/ExerciseController';
import { WorkoutHistoryController } from '../presentation/controllers/workout/WorkoutHistoryController';
import { WorkoutCalendarController } from '../presentation/controllers/workout/WorkoutCalendarController';
import { WorkoutDashboardController } from '../presentation/controllers/workout/WorkoutDashboardController';
import { WorkoutScheduleController } from '../presentation/controllers/workout/WorkoutScheduleController';
// Вызов всех контроллеров зависящих от сервисов, репозиториев и друг друга

// Аутентификация
export const authController = new AuthController(services.authService);

// Тренировки
export const workoutController = new WorkoutController(services.workoutFacade);
export const exerciseController = new ExerciseController(services.workoutFacade);
export const workoutHistoryController = new WorkoutHistoryController(services.workoutFacade);
export const workoutCalendarController = new WorkoutCalendarController(services.workoutFacade);
export const workoutDashboardController = new WorkoutDashboardController(services.workoutFacade);
export const workoutScheduleController = new WorkoutScheduleController(
    services.workoutFacade, 
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
    services.workoutFacade, 
    services.recommendationService);


// Единый объект для вызова всех контроллеров
export const controllers = {
    authController,
    workoutController,
    progressController,
    profileController,
    likeController,
    analyticsController,
    exerciseController,
    workoutHistoryController,
    workoutCalendarController,
    workoutDashboardController,
    workoutScheduleController
};