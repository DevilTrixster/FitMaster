import { Server, Socket } from 'socket.io';
import { WorkoutService } from '../../application/services/WorkoutService';
import { SetResult } from '../../domain/entities/Workout';

interface AuthSocket extends Socket {
  userId?: number;
}

export class WorkoutSocketHandler {
  constructor(
    private io: Server,
    private workoutService: WorkoutService
  ) {}

  public initialize(): void {
    this.io.on('connection', (socket: AuthSocket) => {
      console.log('🔌 Клиент подключился:', socket.id);

      socket.on('authenticate', (data: { token: string; userId: number }) => {
            socket.userId = data.userId;
            socket.join(`user:${data.userId}`);
            console.log(`✅ Пользователь ${data.userId} аутентифицирован`);
        });

      socket.on('workout:start', async (data: { workoutId: number }) => {
        try {
          if (!socket.userId) throw new Error('Не аутентифицирован');
          
          const workout = await this.workoutService.startWorkout(data.workoutId, socket.userId);
          
          socket.to(`user:${socket.userId}`).emit('workout:started', {
            workoutId: workout.id,
            status: workout.status,
          });
          
          socket.emit('workout:start:success', { workout });
        } catch (error: any) {
          socket.emit('workout:start:error', { error: error.message });
        }
      });

      socket.on('workout:set:complete', async (data: { 
        workoutId: number; 
        exerciseId: number; 
        setResult: SetResult 
      }) => {
        try {
          if (!socket.userId) throw new Error('Не аутентифицирован');
          
          await this.workoutService.saveSetResult(
            data.workoutId,
            socket.userId,
            data.exerciseId,
            data.setResult
          );
          
          socket.emit('workout:set:success', { 
            exerciseId: data.exerciseId,
            setNumber: data.setResult.setNumber,
          });
        } catch (error: any) {
          socket.emit('workout:set:error', { error: error.message });
        }
      });

      socket.on('workout:complete', async (data: { 
        workoutId: number; 
        wellnessRating?: number; 
        comments?: string 
      }) => {
        try {
          if (!socket.userId) throw new Error('Не аутентифицирован');
          
          await this.workoutService.completeWorkout(
            data.workoutId,
            socket.userId,
            data.wellnessRating,
            data.comments
          );
          
          socket.emit('workout:complete:success', { message: 'Тренировка завершена' });
        } catch (error: any) {
          socket.emit('workout:complete:error', { error: error.message });
        }
      });

      socket.on('disconnect', () => {
        console.log('🔌 Клиент отключился:', socket.id);
      });
    });
  }
}