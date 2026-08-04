// Экспортер всех сервисов

// Сервисы адаптации
export { DeloadManagementService } from "./adaptation/DeloadManagementService";
export { FatigueRecoveryService } from "./adaptation/FatigueRecoveryService";
export { IntelligentAdaptationService } from "./adaptation/IntelligentAdaptationService";
export { PlateauDetectionService } from "./adaptation/PlateauDetectionService";

// Авторезация
export { AuthService } from "./auth/AuthService";

// Реакция (лайки)
export { ExerciseLikeService } from "./exercise/ExerciseLikeService";

// Профиль
export { ProfileService } from "./profile/ProfileService";

// Аналитика (прогресс в тренировках)
export { ProgressAnalyticsService } from "./analytics/ProgressAnalyticsService";

// Рекомендации
export { RecommendationService } from "./recommendation/RecommendationService";

// Тренировка
export { WorkoutFacade, 
    WorkoutLifecycleService, WorkoutRescheduleService, WorkoutResultsService, WorkoutSchedulingService,
    WorkoutQueryService, WorkoutTargetQueryService } from "./workout/index";