import { repositories } from "./repositories";
import { WorkoutService } from "../application/services/WorkoutService";
import { ExerciseLikeService } from "../application/services/ExerciseLikeService";
import { FatigueRecoveryService } from "../application/services/adaptation/FatigueRecoveryService";
import { DeloadManagementService } from "../application/services/adaptation/DeloadManagementService";
import { PlateauDetectionService } from "../application/services/adaptation/PlateauDetectionService";
import { IntelligentAdaptationService } from "../application/services/adaptation/IntelligentAdaptationService";
import { WorkoutLifecycleService, WorkoutQueryService, WorkoutResultsService, WorkoutSchedulingService } from "../application/services/workout";
import { ProfileService } from "../application/services/ProfileService";
import { AuthService } from "../application/services/AuthService";
import { RecommendationService } from "../application/services/RecommendationService";
import { ProgressAnalyticsService } from "../application/services/ProgressAnalyticsService";
import { WorkoutRescheduleService } from "../application/services/WorkoutRescheduleService";
import { MetricsScheduler } from "../infrastructure/scheduler/MetricsScheduler";

// Вызов всех сервисов зависящих от репозиториев и друг друга

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

export const workoutService = new WorkoutService(
    workoutSchedulingService,
    workoutLifecycleService,
    workoutQueryService,
    workoutResultsService,
    repositories.workoutRepository,
    repositories.deloadRepository);

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

// Перенос
export const rescheduleService = new WorkoutRescheduleService(
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
    metricsScheduler,
};