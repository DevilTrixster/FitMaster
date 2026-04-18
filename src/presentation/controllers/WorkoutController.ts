import { Request, Response, NextFunction } from 'express';
import { WorkoutService } from '../../application/services/WorkoutService';
import { WorkoutRescheduleService } from '../../application/services/WorkoutRescheduleService';


export class WorkoutController {
  constructor(
    private workoutService: WorkoutService,
    private rescheduleService: WorkoutRescheduleService
  ) {}

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

  async rescheduleWorkout(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const workoutId = parseInt(req.params.id as string);
      const dto = req.body;
      
      await this.rescheduleService.reschedule(userId, workoutId, dto);
      res.status(200).json({ message: 'Тренировка успешно перенесена', data: { newDate: dto.newDate } });
    } catch (error) {
      next(error);
    }
  }

  async skipWorkout(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const workoutId = parseInt(req.params.id as string);
      const { reason } = req.body;
      
      await this.rescheduleService.skip(userId, workoutId, reason);
      res.status(200).json({ message: 'Тренировка пропущена' });
    } catch (error) {
      next(error);
    }
  }

  async getExercises(req: Request, res: Response): Promise<void> {
    try {
      const exercises = await this.workoutService.getAllExercises();
      res.json(exercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getDashboard(req: Request, res: Response): Promise<void> {
    console.log('🎯 Вызван getDashboard');
    console.log('👤 userId из токена:', (req as any).userId);
    
    try {
      const userId = (req as any).userId;
      
      if (!userId) {
        console.error('❌ userId не найден в запросе!');
        res.status(401).json({ error: 'Пользователь не авторизован' });
        return;
      }
      
      console.log('📊 Загрузка предстоящих тренировок для пользователя', userId);
      const upcomingWorkouts = await this.workoutService.getUpcomingWorkouts(userId, 5);
      
      console.log('✅ Получено тренировок:', upcomingWorkouts.length);
      
      const responseData = {
        upcomingWorkouts: upcomingWorkouts.map(uw => ({
          id: uw.id,
          workoutName: uw.workout.name,
          scheduledDate: uw.scheduledDate,
          scheduledTime: uw.scheduledTime,
          status: uw.status,
          wellnessRating: uw.wellnessRating,
        })),
      };
      
      console.log('📤 Отправка ответа клиенту');
      res.json(responseData);
    } catch (error: any) {
      console.error('❌ Ошибка в getDashboard:', error);
      console.error('Stack:', error.stack);
      res.status(500).json({ error: error.message });
    }
  }
}