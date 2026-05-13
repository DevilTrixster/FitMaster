import { Request, Response, NextFunction } from 'express';
import { WorkoutService } from '../../application/services/WorkoutService';
import { WorkoutRescheduleService } from '../../application/services/WorkoutRescheduleService';
import { ValidationError, NotFoundError } from '../../core/errors/ValidationError';
import { WorkoutStatus } from '../../domain/entities/Workout';

export class WorkoutController {
  constructor(
    private workoutService: WorkoutService,
    private rescheduleService: WorkoutRescheduleService
  ) {}

  async getCurrentWorkout(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const workout = await this.workoutService.getCurrentWorkout(userId);

    if (!workout) {
      res.status(404).json({ error: 'Нет активной тренировки' });
      return;
    }

    const exercisesWithMetrics = await Promise.all(
    workout.workout.exercises.map(async (ex) => {
      const templates = await this.workoutService.getExerciseMetricTemplates(ex.exercise.id!);
      // Актуальные цели из последней адаптации
      const targets = await this.workoutService.getExerciseTargets(userId, ex.exercise.id!);
      return {
        id: ex.exercise.id,
        name: ex.exercise.name,
        sets: ex.sets,
        restSeconds: ex.restSeconds,
        muscleGroup: ex.exercise.muscleGroup,
        metricTemplates: templates,
        // Если адаптация есть — берём из неё, иначе из шаблона
        targetReps: targets?.reps ?? templates.find(t => t.metricType === 'reps')?.defaultValue,
        targetWeight: targets?.weight ?? templates.find(t => t.metricType === 'weight')?.defaultValue,
      };
    })
  );

    res.json({
      workout: {
        id: workout.id,
        name: workout.workout.name,
        status: workout.status,
        exercises: exercisesWithMetrics,
      },
    });
  }

  async startWorkout(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const { workoutId } = req.body;

    const workout = await this.workoutService.startWorkout(workoutId, userId);
    res.json({ message: 'Тренировка начата', workout });
  }

  async completeWorkout(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const { workoutId, wellnessRating, comments } = req.body;

    if (!workoutId) {
      res.status(400).json({ error: 'Не указан ID тренировки' });
      return;
    }

    await this.workoutService.completeWorkout(workoutId, userId, wellnessRating, comments);
    res.json({ message: 'Тренировка завершена' });
  }

  async pauseWorkout(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const { workoutId, lastExerciseIndex } = req.body;

    await this.workoutService.pauseWorkout(workoutId, userId, lastExerciseIndex || 0);
    res.json({ message: 'Тренировка на паузе' });
  }

  async resumeWorkout(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const { workoutId } = req.body;

    await this.workoutService.resumeWorkout(workoutId, userId);
    res.json({ message: 'Тренировка возобновлена' });
  }

  async getActiveWorkout(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const workout = await this.workoutService.getActiveWorkout(userId);

    if (!workout) {
      res.status(404).json({ error: 'Нет активной тренировки' });
      return;
    }

    res.json({ workout });
  }

  async getWorkoutHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const dateFrom = req.query.from as string;
    const dateTo = req.query.to as string;

    const workouts = await this.workoutService.getWorkoutHistory(
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

  async rescheduleWorkout(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const workoutId = parseInt(req.params.id as string);
    const dto = req.body;

    await this.rescheduleService.reschedule(userId, workoutId, dto);
    res.status(200).json({
      message: 'Тренировка успешно перенесена',
      data: { newDate: dto.newDate },
    });
  }

  async skipWorkout(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const workoutId = parseInt(req.params.id as string);
    const { reason } = req.body;

    await this.rescheduleService.skip(userId, workoutId, reason);
    res.status(200).json({ message: 'Тренировка пропущена' });
  }

  async getExercises(req: Request, res: Response, next: NextFunction): Promise<void> {
    const exercises = await this.workoutService.getAllExercises();
    res.json(
      exercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
      }))
    );
  }

  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    if (!userId) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    const upcomingWorkouts = await this.workoutService.getUpcomingWorkouts(userId, 5);

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

  async saveSetResult(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const { workoutId, exerciseId, setNumber, setType, metrics } = req.body;

    if (!workoutId || !exerciseId) {
      res.status(400).json({ error: 'Не указан workoutId или exerciseId' });
      return;
    }

    if (metrics && Array.isArray(metrics)) {
      for (const m of metrics) {
        if (!m.metricType || m.value === undefined) {
          res.status(400).json({ error: 'Каждая метрика должна содержать metricType и value' });
          return;
        }
      }
      await this.workoutService.saveSetMetrics(
        workoutId,
        userId,
        exerciseId,
        setNumber || 1,
        setType || 'normal',
        metrics
      );
      res.json({ message: 'Результат сохранён' });
      return;
    }

    res.status(400).json({ error: 'Не переданы метрики выполнения' });
  }

  async getCalendar(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const year = parseInt(req.query.year as string, 10);
    const month = parseInt(req.query.month as string, 10);
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      throw new ValidationError('Неверные параметры года или месяца');
    }
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const workouts = await this.workoutService.getWorkoutsInRange(userId, startDate, endDate);
    const calendar: Record<string, { status: string; workoutId?: number }> = {};
    for (const w of workouts) {
      const dateStr = w.scheduledDate.toISOString().split('T')[0];
      calendar[dateStr] = { status: w.status, workoutId: w.id };
    }
    res.json({ calendar });
  }

  async postponeWorkout(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const workoutId = parseInt(req.params.id as string, 10);
    if (isNaN(workoutId)) throw new ValidationError('Invalid workout id');

    const workout = await this.workoutService.getUserWorkoutById(workoutId);
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

    await this.workoutService.postponeWorkout(workoutId, tomorrow);

    res.json({ message: 'Тренировка перенесена на завтра' });
  }
}