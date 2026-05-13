import { Router } from 'express';
import { WorkoutController } from '../controllers/WorkoutController';
import { RequestHandler } from 'express';

export function createWorkoutRoutes(
  workoutController: WorkoutController,
  authMiddleware: RequestHandler
): Router {
  const router = Router();

  router.use(authMiddleware);

  router.get('/dashboard', workoutController.getDashboard.bind(workoutController));
  router.get('/current', workoutController.getCurrentWorkout.bind(workoutController));
  router.get('/history', workoutController.getWorkoutHistory.bind(workoutController));
  router.post('/start', workoutController.startWorkout.bind(workoutController));
  router.post('/complete', workoutController.completeWorkout.bind(workoutController));
  router.post('/pause', workoutController.pauseWorkout.bind(workoutController));
  router.post('/resume', workoutController.resumeWorkout.bind(workoutController));
  router.post('/save-set', workoutController.saveSetResult.bind(workoutController));
  router.post('/:id/postpone', workoutController.postponeWorkout.bind(workoutController));
  router.get('/active', workoutController.getActiveWorkout.bind(workoutController));
  router.get('/exercises', workoutController.getExercises.bind(workoutController));
  router.get('/calendar', workoutController.getCalendar.bind(workoutController));

  router.patch('/workouts/:id/reschedule', workoutController.rescheduleWorkout.bind(workoutController));
  router.patch('/workouts/:id/skip', workoutController.skipWorkout.bind(workoutController));

  return router;
}