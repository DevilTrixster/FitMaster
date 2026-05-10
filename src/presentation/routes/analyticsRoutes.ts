import { Router } from 'express';
import { AnalyticsController } from '../controllers/AnalyticsController';
import { RequestHandler } from 'express';

export function createAnalyticsRoutes(
  controller: AnalyticsController,
  authMiddleware: RequestHandler
): Router {
  const router = Router();
  router.use(authMiddleware);

  router.get('/recovery', controller.getRecovery.bind(controller));
  router.get('/adaptations', controller.getAdaptations.bind(controller));

  return router;
}