import { Router } from 'express';
import { WorkoutHistoryController } from '../controllers/workout/WorkoutHistoryController';
import { RequestHandler } from 'express';

export function createWorkoutHistoryRoutes(
  workoutHistoryController: WorkoutHistoryController,
  authMiddleware: RequestHandler
): Router {
  const router = Router();

  router.use(authMiddleware);

  router.get('/history', workoutHistoryController.getHistory.bind(workoutHistoryController));
  router.get('/:id/details', workoutHistoryController.getWorkoutDetails.bind(workoutHistoryController));

  return router;
}

