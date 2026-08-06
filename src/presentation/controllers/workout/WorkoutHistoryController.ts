import { Request, Response, NextFunction } from 'express';
import { WorkoutFacade } from '../../../application/services/workout/WorkoutFacade';
import { ValidationError, NotFoundError } from '../../../core/errors/ValidationError';
import { WorkoutStatus } from '../../../domain/entities';

export class WorkoutHistoryController {
  constructor(
    private workoutFacade: WorkoutFacade
  ) {}

  async getWorkoutHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const dateFrom = req.query.from as string;
    const dateTo = req.query.to as string;

    const workouts = await this.workoutFacade.getWorkoutHistory(
      userId,
      limit,
      (page - 1) * limit,
      status,
      dateFrom,
      dateTo
    );

    res.json({
      workouts: workouts.map(w => ({
        id: w.id,
        workoutName: w.workout.name,
        scheduledDate: w.scheduledDate,
        scheduledTime: w.scheduledTime,
        status: w.status,
        wellnessRating: w.wellnessRating,
        comments: w.comments,
        completedAt: w.completedAt,
      })),
    });
  }

  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 30); // максимум 30 за раз
    const offset = parseInt(req.query.offset as string) || 0;
    const sortBy = req.query.sortBy as string || 'scheduled_date';
    const sortOrder = (req.query.sortOrder as string || 'DESC').toUpperCase() as 'ASC' | 'DESC';
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    const exerciseId = req.query.exerciseId ? parseInt(req.query.exerciseId as string) : undefined;
    const muscleGroup = req.query.muscleGroup as string;

    // Глобальное ограничение истории – 300 тренировок
    const MAX_HISTORY = 300;
    if (offset >= MAX_HISTORY) {
      res.json({ workouts: [], total: 0, hasMore: false });
      return;
    }

    const workouts = await this.workoutFacade.getCompletedWorkoutsHistory(
      userId, limit, offset, sortBy, sortOrder, dateFrom, dateTo, exerciseId, muscleGroup
    );
    const total = await this.workoutFacade.countCompletedWorkouts(userId, dateFrom, dateTo, exerciseId, muscleGroup);
    const totalLimited = Math.min(total, MAX_HISTORY);
    const hasMore = offset + limit < totalLimited;

    res.json({
      workouts: workouts.map(w => ({
        id: w.id,
        workoutName: w.workout.name,
        scheduledDate: w.scheduledDate,
        scheduledTime: w.scheduledTime,
        wellnessRating: w.wellnessRating,
        comments: w.comments,
        completedAt: w.completedAt
      })),
      total: totalLimited,
      hasMore,
      offset,
      limit
    });
  }

  async getWorkoutDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const workoutId = parseInt(req.params.id as string);
    if (isNaN(workoutId)) {
      res.status(400).json({ error: 'Invalid workout id' });
      return;
    }
    const details = await this.workoutFacade.getWorkoutDetails(workoutId, userId);
    if (!details) {
      res.status(404).json({ error: 'Workout not found' });
      return;
    }
    res.json(details);
  }
}