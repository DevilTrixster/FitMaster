import { Request, Response, NextFunction } from 'express';
import { WorkoutFacade } from '../../../application/services/workout/WorkoutFacade';
import { WorkoutRescheduleService } from '../../../application/services/workout/commands/WorkoutRescheduleService';
import { ValidationError, NotFoundError } from '../../../core/errors/ValidationError';
import { WorkoutStatus } from '../../../domain/entities';

export class WorkoutScheduleController {
  constructor(
    private workoutFacade: WorkoutFacade,
    private rescheduleService: WorkoutRescheduleService
  ) {}
  
  async rescheduleWorkout(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const workoutId = parseInt(req.params.id as string);
    const dto = req.body;

    await this.rescheduleService.rescheduleWorkout(userId, workoutId, dto);
    res.status(200).json({
      message: 'Тренировка успешно перенесена',
      data: { newDate: dto.newDate },
    });
  }

  async skipWorkout(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const workoutId = parseInt(req.params.id as string);
    const { reason } = req.body;

    await this.rescheduleService.postponeWorkout(userId, workoutId, reason);
    res.status(200).json({ message: 'Тренировка пропущена' });
  }

  async postponeWorkout(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const workoutId = parseInt(req.params.id as string, 10);
    if (isNaN(workoutId)) throw new ValidationError('Invalid workout id');

    const workout = await this.workoutFacade.getUserWorkoutById(workoutId, userId);
    if (!workout || workout.userId !== userId) throw new NotFoundError('Тренировка не найдена');
    if (workout.status !== WorkoutStatus.Scheduled) throw new ValidationError('Можно перенести только запланированную тренировку');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const workoutDate = new Date(workout.scheduledDate);
    workoutDate.setHours(0, 0, 0, 0);
    if (workoutDate.getTime() !== today.getTime()) {
      throw new ValidationError('Можно перенести только тренировку на сегодня');
    }

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    await this.workoutFacade.postponeWorkout(workoutId, userId, tomorrow);

    res.json({ message: 'Тренировка перенесена на завтра' });
  }
}