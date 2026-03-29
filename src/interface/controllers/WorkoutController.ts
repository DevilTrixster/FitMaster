import { Request, Response } from 'express';
import { WorkoutService } from '../../application/services/WorkoutService';

export class WorkoutController {
  constructor(private workoutService: WorkoutService) {}

  // Получение данных для дашборда
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

  // Завершение тренировки
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

  // Получение текущей тренировки для выполнения
  async getCurrentWorkout(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const upcomingWorkouts = await this.workoutService.getUpcomingWorkouts(userId, 1);
      
      if (upcomingWorkouts.length === 0) {
        res.status(404).json({ error: 'Нет запланированных тренировок' });
        return;
      }
      
      const workout = upcomingWorkouts[0];
      
      res.json({
        workout: {
          id: workout.id,
          name: workout.workout.name,
          exercises: workout.workout.exercises.map(ex => ({
            name: ex.exercise.name,
            sets: ex.sets,
            repMin: ex.repMin,
            repMax: ex.repMax,
            restSeconds: ex.restSeconds,
            muscleGroup: ex.exercise.muscleGroup,
          })),
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}