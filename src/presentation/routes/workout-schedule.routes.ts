import { Router } from 'express';
import { WorkoutScheduleController } from '../controllers/workout/WorkoutScheduleController';
import { RequestHandler } from 'express';

export function createWorkoutScheduleRoutes(
  workoutScheduleController: WorkoutScheduleController,
  authMiddleware: RequestHandler
): Router {
  const router = Router();

  router.use(authMiddleware);

  router.post('/:id/postpone', workoutScheduleController.postponeWorkout.bind(workoutScheduleController));
  router.patch('/workouts/:id/reschedule', workoutScheduleController.rescheduleWorkout.bind(workoutScheduleController));
  router.patch('/workouts/:id/skip', workoutScheduleController.skipWorkout.bind(workoutScheduleController));

  return router;
}

