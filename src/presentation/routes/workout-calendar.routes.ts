import { Router } from 'express';
import { WorkoutCalendarController } from '../controllers/workout/WorkoutCalendarController';
import { RequestHandler } from 'express';

export function createWorkoutCalendarRoutes(
  workoutCalendarController: WorkoutCalendarController,
  authMiddleware: RequestHandler
): Router {
  const router = Router();

  router.use(authMiddleware);

  router.get('/calendar', workoutCalendarController.getCalendar.bind(workoutCalendarController));

  return router;
}

