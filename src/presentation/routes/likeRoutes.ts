import { Router } from 'express';
import { LikeController } from '../controllers/LikeController';
import { RequestHandler } from 'express';

export function createLikeRoutes(controller: LikeController, authMiddleware: RequestHandler): Router {
  const router = Router();
  router.use(authMiddleware);
  router.get('/', controller.getUserLikes.bind(controller));
  router.post('/:exerciseId', controller.setLike.bind(controller));
  return router;
}