import { Router } from 'express';
import { WorkoutController } from '../controllers/WorkoutController';
import { RequestHandler } from 'express';

export function createWorkoutRoutes(workoutController: WorkoutController, authMiddleware: RequestHandler): Router {
  const router = Router();

  router.use(authMiddleware);

  router.get('/dashboard', (req, res) => workoutController.getDashboard(req, res));
  router.get('/current', (req, res) => workoutController.getCurrentWorkout(req, res));
  router.get('/history', (req, res) => workoutController.getWorkoutHistory(req, res));
  router.post('/start', (req, res) => workoutController.startWorkout(req, res));
  router.post('/complete', (req, res) => workoutController.completeWorkout(req, res));

  return router;
}