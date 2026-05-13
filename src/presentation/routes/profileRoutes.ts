import { Router } from 'express';
import { ProfileController } from '../controllers/ProfileController';
import { RequestHandler } from 'express';
import { uploadAvatar } from '../middleware/uploadMiddleware';

export function createProfileRoutes(
  profileController: ProfileController,
  authMiddleware: RequestHandler
): Router {
  const router = Router();
  router.use(authMiddleware);

  router.get('/', profileController.getProfile.bind(profileController));
  router.put('/', profileController.updateProfile.bind(profileController));
  router.post('/avatar', uploadAvatar, profileController.uploadAvatar.bind(profileController));
  router.get('/preferred-days', profileController.getPreferredDays.bind(profileController));
  router.put('/preferred-days', profileController.updatePreferredDays.bind(profileController));

  return router;
}