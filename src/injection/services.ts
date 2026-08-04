import { DeloadManagementService, FatigueRecoveryService, IntelligentAdaptationService, PlateauDetectionService, 
    AuthService, ExerciseLikeService, ProfileService, ProgressAnalyticsService, RecommendationService,
    WorkoutFacade, WorkoutLifecycleService, WorkoutRescheduleService, WorkoutResultsService, WorkoutSchedulingService, WorkoutQueryService, WorkoutTargetQueryService } from "../application/services/index"
import { repositories } from "./repositories";
import { MetricsScheduler } from "../infrastructure/scheduler/MetricsScheduler";

// Вызов всех сервисов, зависящих от репозиториев и друг друга

// Лайки
export const exerciseLikeService = new ExerciseLikeService(repositories.exerciseLikeRepository);

// Адаптация
export const fatigueService = new FatigueRecoveryService(
    repositories.workoutRepository, 
    repositories.fatigueRepository, 
    repositories.deloadRepository);

export const deloadManagementService = new DeloadManagementService(
    repositories.deloadRepository, 
    fatigueService);

export const plateauService = new PlateauDetectionService(
    repositories.workoutRepository,
    repositories.substitutionRepository,
    repositories.recommendationRepository,
    exerciseLikeService);

export const intelligentAdaptationService = new IntelligentAdaptationService(          
    repositories.workoutRepository,
    repositories.userRepository,
    fatigueService,
    plateauService,
    exerciseLikeService);

// Тренировки
export const workoutSchedulingService = new WorkoutSchedulingService(
    repositories.workoutRepository,
    repositories.userRepository,
    repositories.recommendationRepository);

export const workoutResultsService = new WorkoutResultsService(
    repositories.workoutRepository,
    repositories.userRepository,
    intelligentAdaptationService,
    fatigueService,
    deloadManagementService);

export const workoutLifecycleService = new WorkoutLifecycleService(
    repositories.workoutRepository, 
    workoutResultsService);

export const workoutQueryService = new WorkoutQueryService(
    repositories.workoutRepository, 
    workoutSchedulingService);

export const rescheduleService = new WorkoutRescheduleService(
    repositories.workoutRepository);

export const targetQueryService = new WorkoutTargetQueryService(
    workoutQueryService,
    repositories.deloadRepository
);

export const workoutService = new WorkoutFacade(
    workoutSchedulingService,
    workoutLifecycleService,
    workoutQueryService,
    workoutResultsService,
    rescheduleService,
    targetQueryService
);

// Профиль и аутентификация 
export const profileService = new ProfileService(
    repositories.userRepository,
    repositories.workoutRepository,
    workoutSchedulingService,
    intelligentAdaptationService);

export const authService = new AuthService(
    repositories.userRepository, 
    workoutService, 
    intelligentAdaptationService);

// Аналитика и прогресс
export const progressService = new ProgressAnalyticsService(
    repositories.progressRepository);

export const recommendationService = new RecommendationService(
    repositories.recommendationRepository, 
    repositories.deloadRepository, 
    repositories.workoutRepository);

// Планировщик 
export const metricsScheduler = new MetricsScheduler(
    fatigueService, 
    repositories.userRepository);

// Единый вызов Сервисов
export const services = {
    exerciseLikeService,
    fatigueService,
    deloadManagementService,
    plateauService,
    intelligentAdaptationService,
    workoutSchedulingService,
    workoutResultsService,
    workoutLifecycleService,
    workoutQueryService,
    workoutService,
    profileService,
    authService,
    progressService,
    recommendationService,
    rescheduleService,
    targetQueryService,
    metricsScheduler,
};