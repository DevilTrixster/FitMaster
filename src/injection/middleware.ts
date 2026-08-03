import { services } from './services';
import { createAuthMiddleware } from '../presentation/middleware/authMiddleware';

export const authMiddleware = createAuthMiddleware(services.authService, services.fatigueService);