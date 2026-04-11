import { Request, Response } from 'express';
import { WorkoutService } from '../../application/services/WorkoutService';

export class WorkoutController {
  constructor(private workoutService: WorkoutService) {}

  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      
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
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getCurrentWorkout(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      
      const workout = await this.workoutService.getCurrentWorkout(userId);
      
      if (!workout) {
        res.status(404).json({ error: 'Нет активной тренировки' });
        return;
      }
      
      res.json({
        workout: {
          id: workout.id,
          name: workout.workout.name,
          status: workout.status,
          // ✅ ИСПРАВЛЕНИЕ: добавляем типизацию
          exercises: workout.workout.exercises.map((ex: any) => ({
            id: ex.exercise.id,
            name: ex.exercise.name,
            sets: ex.sets,
            repMin: ex.repMin,
            repMax: ex.repMax,
            restSeconds: ex.restSeconds,
            targetWeight: ex.targetWeight,
            muscleGroup: ex.exercise.muscleGroup,
          })),
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async startWorkout(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { workoutId } = req.body;
      
      const workout = await this.workoutService.startWorkout(workoutId, userId);
      
      res.json({ message: 'Тренировка начата', workout });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async completeWorkout(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { workoutId, wellnessRating, comments } = req.body;
      
      await this.workoutService.completeWorkout(workoutId, userId, wellnessRating, comments);
      
      res.json({ message: 'Тренировка завершена' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async pauseWorkout(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { workoutId, lastExerciseIndex } = req.body;
      
      await this.workoutService.pauseWorkout(workoutId, userId, lastExerciseIndex || 0);
      
      res.json({ message: 'Тренировка на паузе' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async resumeWorkout(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { workoutId } = req.body;
      
      await this.workoutService.resumeWorkout(workoutId, userId);
      
      res.json({ message: 'Тренировка возобновлена' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getActiveWorkout(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      
      const workout = await this.workoutService.getActiveWorkout(userId);
      
      if (!workout) {
        res.status(404).json({ error: 'Нет активной тренировки' });
        return;
      }
      
      res.json({ workout });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getWorkoutHistory(req: Request, res: Response): Promise<void> {
    try {
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
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}