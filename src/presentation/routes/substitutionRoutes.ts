import { Router } from 'express';
import { SubstitutionController } from '../controllers/SubstitutionController';
import { RequestHandler } from 'express';

export function createSubstitutionRoutes(
  controller: SubstitutionController,
  authMiddleware: RequestHandler
): Router {
  const router = Router();
  router.use(authMiddleware);

  router.get('/', (req, res) => controller.getSubstitutions(req, res));
  router.post('/accept', (req, res) => controller.acceptSubstitution(req, res));

  return router;
}