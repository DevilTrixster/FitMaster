import { Router } from 'express';
import { WorkoutController } from '../controllers/WorkoutController';
import { RequestHandler } from 'express';


export function createWorkoutRoutes(
  workoutController: WorkoutController, 
  authMiddleware: RequestHandler 
): Router {
  const router = Router();
  
  router.use(authMiddleware);
  
  router.get('/dashboard', (req, res) => workoutController.getDashboard(req, res));
  router.get('/current', (req, res) => workoutController.getCurrentWorkout(req, res));
  router.get('/history', (req, res) => workoutController.getWorkoutHistory(req, res));
  router.post('/start', (req, res) => workoutController.startWorkout(req, res));
  router.post('/complete', (req, res) => workoutController.completeWorkout(req, res));
  router.post('/pause', (req, res) => workoutController.pauseWorkout(req, res));
  router.post('/resume', (req, res) => workoutController.resumeWorkout(req, res));
  router.post('/save-set', (req, res) => workoutController.saveSetResult(req, res));
  router.get('/active', (req, res) => workoutController.getActiveWorkout(req, res));
  router.get('/exercises', (req, res) => workoutController.getExercises(req, res));
  
  router.patch('/workouts/:id/reschedule', (req, res, next) =>
    workoutController.rescheduleWorkout(req, res, next)
  );
  
  router.patch('/workouts/:id/skip', (req, res, next) =>
    workoutController.skipWorkout(req, res, next)
  );
  
  return router;
}