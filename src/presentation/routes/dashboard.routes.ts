import { Router } from 'express';
import { WorkoutDashboardController } from '../controllers/workout/WorkoutDashboardController';
import { RequestHandler } from 'express';

export function createDashboardRoutes(
  workoutDashboardController: WorkoutDashboardController,
  authMiddleware: RequestHandler
): Router {
  const router = Router();

  router.use(authMiddleware);

  router.get('/dashboard', workoutDashboardController.getDashboard.bind(workoutDashboardController));

  return router;
}

