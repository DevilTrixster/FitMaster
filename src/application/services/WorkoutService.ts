import { Workout, UserWorkout, WorkoutStatus } from '../../domain/entities/Workout';
import { IWorkoutRepository } from '../../domain/interfaces/IWorkoutRepository';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';

export class WorkoutService {
  constructor(
    private workoutRepository: IWorkoutRepository,
    private userRepository: IUserRepository
  ) {}

  // Генерация базовой программы после регистрации
  async generateBaseProgram(userId: number): Promise<UserWorkout[]> {
    // Получаем базовую программу
    const baseWorkout = await this.workoutRepository.getBaseWorkout();
    if (!baseWorkout) {
      throw new Error('Базовая программа тренировок не найдена');
    }

    // Получаем пользователя для расчёта персональных параметров
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('Пользователь не найден');
    }

    // Генерируем расписание на 4 недели вперёд (3 раза в неделю: Пн, Ср, Пт)
    const scheduledWorkouts: UserWorkout[] = [];
    const startDate = new Date();
    
    for (let week = 0; week < 4; week++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + (week * 7));
      
      // Понедельник (1), Среда (3), Пятница (5)
      const daysOffset = [1, 3, 5];
      
      for (const dayOffset of daysOffset) {
        const workoutDate = new Date(weekStart);
        // Корректируем до нужного дня недели
        const currentDay = workoutDate.getDay();
        const targetDay = dayOffset;
        const diff = targetDay - currentDay;
        workoutDate.setDate(workoutDate.getDate() + (diff >= 0 ? diff : diff + 7));
        
        // Не создаём тренировки в прошлом
        if (workoutDate < new Date()) continue;
        
        const userWorkout = new UserWorkout({
          userId,
          workout: baseWorkout,
          scheduledDate: workoutDate,
          scheduledTime: '10:00',
          status: WorkoutStatus.Scheduled,
        });
        
        const saved = await this.workoutRepository.createUserWorkout(userWorkout);
        scheduledWorkouts.push(saved);
      }
    }

    return scheduledWorkouts;
  }

  // Получение предстоящих тренировок
  async getUpcomingWorkouts(userId: number, limit: number = 5): Promise<UserWorkout[]> {
    return this.workoutRepository.getUserWorkouts(userId, limit);
  }

  // Завершение тренировки с оценкой самочувствия (ТЗ пункт 1.a)
  async completeWorkout(workoutId: number, userId: number, wellnessRating?: number, comments?: string): Promise<void> {
    const userWorkout = await this.workoutRepository.getUserWorkoutById(workoutId);
    
    if (!userWorkout) {
      throw new Error('Тренировка не найдена');
    }
    
    if (userWorkout.userId !== userId) {
      throw new Error('Доступ запрещён');
    }
    
    // Если оценка не установлена - считаем удовлетворительной (3 из 5)
    const rating = wellnessRating || 3;
    
    await this.workoutRepository.updateUserWorkoutStatus(
      workoutId,
      WorkoutStatus.Completed,
      rating,
      comments
    );
    
  }

  // Расчёт рекомендуемого веса на основе параметров пользователя
  calculateRecommendedWeight(userWeight: number, exerciseType: string): number {
    // Базовая формула: процент от веса тела в зависимости от упражнения
    const percentages: Record<string, number> = {
      'chest': 0.5,    // 50% от веса тела для жима
      'back': 0.6,     // 60% для тяги
      'legs': 0.75,    // 75% для приседаний
      'shoulders': 0.3, // 30% для жима над головой
      'core': 0,       // Собственный вес
    };
    
    const basePercentage = percentages[exerciseType] || 0.5;
    return Math.round(userWeight * basePercentage);
  }
}