import { Router } from 'express';
import { WorkoutController } from '../controllers/WorkoutController';
import { RequestHandler } from 'express';

export function createWorkoutRoutes(workoutController: WorkoutController, authMiddleware: RequestHandler): Router {
  const router = Router();

  // Все маршруты защищены авторизацией
  router.use(authMiddleware);

  router.get('/dashboard', (req, res) => workoutController.getDashboard(req, res));
  router.get('/current', (req, res) => workoutController.getCurrentWorkout(req, res));
  router.post('/complete', (req, res) => workoutController.completeWorkout(req, res));

  return router;
}