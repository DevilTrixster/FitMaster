import { Router } from 'express';
import { WorkoutController } from '../controllers/workout/WorkoutController';
import { RequestHandler } from 'express';

export function createWorkoutRoutes(
  workoutController: WorkoutController,
  authMiddleware: RequestHandler
): Router {
  const router = Router();

  router.use(authMiddleware);

  router.get('/current', workoutController.getCurrentWorkout.bind(workoutController));
  router.post('/start', workoutController.startWorkout.bind(workoutController));
  router.post('/complete', workoutController.completeWorkout.bind(workoutController));
  router.post('/pause', workoutController.pauseWorkout.bind(workoutController));
  router.post('/resume', workoutController.resumeWorkout.bind(workoutController));
  router.post('/save-set', workoutController.saveSetResult.bind(workoutController));
  router.get('/active', workoutController.getActiveWorkout.bind(workoutController));

  return router;
}

