import { Router } from 'express';
import { ProfileController } from '../controllers/ProfileController';
import { RequestHandler } from 'express';

export function createProfileRoutes(
  profileController: ProfileController,
  authMiddleware: RequestHandler
): Router {
  const router = Router();
  router.use(authMiddleware);

  router.get('/', profileController.getProfile.bind(profileController));
  router.put('/', profileController.updateProfile.bind(profileController));

  return router;
}