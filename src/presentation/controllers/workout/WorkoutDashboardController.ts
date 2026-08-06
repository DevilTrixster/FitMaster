import { Request, Response, NextFunction } from 'express';
import { WorkoutFacade } from '../../../application/services/workout/WorkoutFacade';
import { ValidationError, NotFoundError } from '../../../core/errors/ValidationError';
import { WorkoutStatus } from '../../../domain/entities';

export class WorkoutDashboardController {
  constructor(
    private workoutFacade: WorkoutFacade
  ) {}

  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    if (!userId) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    const upcomingWorkouts = await this.workoutFacade.getUpcomingWorkouts(userId, 5);

    res.json({
      upcomingWorkouts: upcomingWorkouts.map(uw => ({
        id: uw.id,
        workoutName: uw.workout.name,
        scheduledDate: uw.scheduledDate,
        scheduledTime: uw.scheduledTime,
        status: uw.status,
        wellnessRating: uw.wellnessRating,
      })),
    });
  }

}