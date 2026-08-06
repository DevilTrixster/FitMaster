import { Request, Response, NextFunction } from 'express';
import { WorkoutFacade } from '../../../application/services/workout/WorkoutFacade';
import { ValidationError, NotFoundError } from '../../../core/errors/ValidationError';
import { WorkoutStatus } from '../../../domain/entities';

export class WorkoutController {
  constructor(
    private workoutFacade: WorkoutFacade
  ) {}

  async getCurrentWorkout(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const workout = await this.workoutFacade.getCurrentWorkout(userId);

    if (!workout) {
      res.status(404).json({ error: 'Нет активной тренировки' });
      return;
    }

    const exercisesWithMetrics = await Promise.all(
    workout.workout.exercises.map(async (ex) => {
      const templates = await this.workoutFacade.getExerciseMetricTemplates(ex.exercise.id!);
      // Актуальные цели из последней адаптации
      const targets = await this.workoutFacade.getExerciseTargets(userId, ex.exercise.id!);
      return {
        id: ex.exercise.id,
        name: ex.exercise.name,
        sets: ex.sets,
        restSeconds: ex.restSeconds,
        muscleGroup: ex.exercise.muscleGroup,
        metricTemplates: templates,
        // Если адаптация есть — берём из неё, иначе из шаблона
        targetReps: targets?.targetReps ?? templates.find(t => t.metricType === 'reps')?.defaultValue,
        targetWeight: targets?.targetWeight ?? templates.find(t => t.metricType === 'weight')?.defaultValue,
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

    const workout = await this.workoutFacade.startWorkout(workoutId, userId);
    res.json({ message: 'Тренировка начата', workout });
  }

  async completeWorkout(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const { workoutId, wellnessRating, comments } = req.body;

    if (!workoutId) {
      res.status(400).json({ error: 'Не указан ID тренировки' });
      return;
    }

    await this.workoutFacade.completeWorkout(workoutId, userId, wellnessRating, comments);
    res.json({ message: 'Тренировка завершена' });
  }

  async pauseWorkout(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const { workoutId, lastExerciseIndex } = req.body;

    await this.workoutFacade.pauseWorkout(workoutId, userId, lastExerciseIndex || 0);
    res.json({ message: 'Тренировка на паузе' });
  }

  async resumeWorkout(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const { workoutId } = req.body;

    await this.workoutFacade.resumeWorkout(workoutId, userId);
    res.json({ message: 'Тренировка возобновлена' });
  }

  async getActiveWorkout(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const workout = await this.workoutFacade.getActiveWorkout(userId);

    if (!workout) {
      res.status(404).json({ error: 'Нет активной тренировки' });
      return;
    }

    res.json({ workout });
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
      await this.workoutFacade.saveSetMetrics(
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
}