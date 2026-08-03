import { database } from "./database";
import { WorkoutRepository } from "../infrastructure/repositories/WorkoutRepository";
import { UserRepository } from "../infrastructure/repositories/UserRepository";
import { ProgressRepository } from "../infrastructure/repositories/ProgressRepository";
import { FatigueRepository } from "../infrastructure/repositories/FatigueRepository";
import { ExerciseSubstitutionRepository } from "../infrastructure/repositories/ExerciseSubstitutionRepository";
import { DeloadRepository } from "../infrastructure/repositories/DeloadRepository";
import { ExerciseRecommendationRepository } from "../infrastructure/repositories/ExerciseRecommendationRepository";
import { ExerciseLikeRepository } from "../infrastructure/repositories/ExerciseLikeRepository";

// Создание ВСЕХ репозиториев в одном месте

// Пользователи
export const userRepository = new UserRepository(database);

// Тренировки
export const workoutRepository = new WorkoutRepository(database);

// Прогресс
export const progressRepository = new ProgressRepository(database);

// Адаптация
export const fatigueRepository = new FatigueRepository(database);
export const substitutionRepository = new ExerciseSubstitutionRepository(database);
export const deloadRepository = new DeloadRepository(database);
export const recommendationRepository = new ExerciseRecommendationRepository(database);

// Лайки
export const exerciseLikeRepository = new ExerciseLikeRepository(database);

// Единый объект для вызова всех репозиториев
export const repositories = {
    userRepository,
    workoutRepository,
    progressRepository,
    fatigueRepository,
    substitutionRepository,
    deloadRepository,
    recommendationRepository,
    exerciseLikeRepository,
};