import { Router } from 'express';
import { ProgressController } from '../controllers/ProgressController';
import { RequestHandler } from 'express';

export function createProgressRoutes(
  progressController: ProgressController,
  authMiddleware: RequestHandler
): Router {
  const router = Router();
  router.use(authMiddleware);

  router.get('/exercise/:id', (req, res, next) => 
    progressController.getExerciseProgress(req, res, next)
  );
  router.get('/muscle-groups', (req, res, next) => 
    progressController.getMuscleGroupStats(req, res, next)
  );
  router.get('/rpe', authMiddleware, (req, res) => 
    progressController.getRPEData(req, res)
  );

  return router;
}