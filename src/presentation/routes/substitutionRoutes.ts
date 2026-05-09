import { Router } from 'express';
import { SubstitutionController } from '../controllers/SubstitutionController';
import { RequestHandler } from 'express';

export function createSubstitutionRoutes(
  controller: SubstitutionController,
  authMiddleware: RequestHandler
): Router {
  const router = Router();
  router.use(authMiddleware);

  router.get('/', controller.getSubstitutions.bind(controller));
  router.post('/accept', controller.acceptSubstitution.bind(controller));

  return router;
}