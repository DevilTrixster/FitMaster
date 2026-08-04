import { Request, Response, NextFunction } from 'express';
import { FatigueRecoveryService } from '../../application/services/adaptation/FatigueRecoveryService';
import { WorkoutFacade } from '../../application/services/workout/WorkoutFacade';
import { RecommendationService } from '../../application/services/recommendation/RecommendationService';

export class AnalyticsController {
  constructor(
    private fatigueService: FatigueRecoveryService,
    private workoutService: WorkoutFacade,
    private recommendationService: RecommendationService
  ) {}

  async getRecovery(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const metrics = await this.fatigueService.calculateMetrics(userId);
    res.json(metrics);
  }

  async getAdaptations(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const limit = parseInt(req.query.limit as string) || 20;
    // Получаем адаптации через WorkoutService? У нас есть метод getUserAdaptations в репозитории.
    // Лучше обращаться к репозиторию напрямую через сервис, но WorkoutService не имеет такого метода.
    // Добавим метод в WorkoutService или просто получим через репозиторий? Чтобы не нарушать слои,
    // добавим в WorkoutService метод getAdaptations(userId, limit?) и пусть он вызывает queryService или напрямую репу.
    // Сейчас в WorkoutService есть метод getExerciseSubstitutions, но не общие адаптации.
    // Поэтому временно обратимся к репозиторию из контроллера (не идеально, но для скорости).
    // Лучше: создадим в WorkoutService публичный метод getAdaptations, который дёргает репозиторий.
    // Пока для простоты я добавлю метод в WorkoutService через существующий workoutRepo (у нас есть доступ к репозиторию в сервисах).
    // Но WorkoutService не хранит ссылку на WorkoutRepository, он использует подсервисы. Поэтому добавим метод в WorkoutQueryService и прокинем через WorkoutService.
    // Быстро: в WorkoutService добавим метод `async getAdaptations(userId: number, limit?: number) { return this.queryService.getAdaptations(userId, limit); }`
    // и реализуем `getAdaptations` в WorkoutQueryService.
    // Я так и сделаю, чтобы сохранить чистоту.
    // Пока контроллер будет использовать `this.workoutService.getAdaptations(userId, limit)`.
    const adaptations = await this.workoutService.getAdaptations(userId, limit);
    res.json(adaptations);
  }

  async getRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const data = await this.recommendationService.getUserRecommendations(userId);
    res.json(data);
  }
}