import { Router } from 'express';
import { ExerciseController } from '../controllers/ExerciseController';
import { RequestHandler } from 'express';

export function createExerciseRoutes(
  exerciseController: ExerciseController,
  authMiddleware: RequestHandler
): Router {
  const router = Router();

  router.use(authMiddleware);

  router.get('/exercises', exerciseController.getExercises.bind(exerciseController));

  return router;
}