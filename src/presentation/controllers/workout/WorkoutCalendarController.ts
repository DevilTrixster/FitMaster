import { Request, Response, NextFunction } from 'express';
import { WorkoutFacade } from '../../../application/services/workout/WorkoutFacade';
import { ValidationError, NotFoundError } from '../../../core/errors/ValidationError';
import { WorkoutStatus } from '../../../domain/entities';

export class WorkoutCalendarController {
  constructor(
    private workoutFacade: WorkoutFacade
  ) {}
  
  async getCalendar(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const year = parseInt(req.query.year as string, 10);
    const month = parseInt(req.query.month as string, 10);
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      throw new ValidationError('Неверные параметры года или месяца');
    }
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const workouts = await this.workoutFacade.getWorkoutsInRange(userId, startDate, endDate);
    const calendar: Record<string, { status: string; workoutId?: number }> = {};
    for (const w of workouts) {
      const d = w.scheduledDate;
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      calendar[dateStr] = { status: w.status, workoutId: w.id };
    }
    res.json({ calendar });
  }
}