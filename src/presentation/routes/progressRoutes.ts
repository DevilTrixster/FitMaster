import { Router } from 'express';
import { ProgressController } from '../controllers/ProgressController';
import { RequestHandler } from 'express';

export function createProgressRoutes(
  progressController: ProgressController,
  authMiddleware: RequestHandler
): Router {
  const router = Router();
  router.use(authMiddleware);

  router.get('/exercise/:id', progressController.getExerciseProgress.bind(progressController));
  router.get('/muscle-groups', progressController.getMuscleGroupStats.bind(progressController));
  router.get('/rpe', progressController.getRPEData.bind(progressController));

  return router;
}