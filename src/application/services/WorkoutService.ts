import { Workout, UserWorkout, WorkoutStatus, SetResult, WorkoutAdaptation, AdaptationType, WorkoutExerciseResult } from '../../domain/entities/Workout';
import { IWorkoutRepository } from '../../domain/interfaces/IWorkoutRepository';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
export class WorkoutService {
  constructor(
    private workoutRepository: IWorkoutRepository,
    private userRepository: IUserRepository
  ) {}

async generateBaseProgram(userId: number): Promise<UserWorkout[]> {
  const baseWorkout = await this.workoutRepository.getBaseWorkout();
  if (!baseWorkout) {
    throw new Error('Базовая программа тренировок не найдена');
  }

  const user = await this.userRepository.findById(userId);
  if (!user) {
    throw new Error('Пользователь не найден');
  }

  const scheduledWorkouts: UserWorkout[] = [];
  
  // Находим ближайший понедельник
  const today = new Date();
  const startDate = new Date(today);
  
  // Находим следующий понедельник (1 = понедельник)
  const dayOfWeek = startDate.getDay(); // 0 = воскресенье, 6 = суббота
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
  
  // Если сегодня понедельник, начинаем с него, иначе - следующий понедельник
  startDate.setDate(startDate.getDate() + (dayOfWeek === 1 ? 0 : daysUntilMonday));
  
  // Устанавливаем время 10:00
  startDate.setHours(10, 0, 0, 0);
  
  // Генерируем тренировки на 4 недели вперёд
  for (let week = 0; week < 4; week++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() + (week * 7));
    
    // Понедельник (1), Среда (3), Пятница (5)
    const daysOffset = [0, 2, 4]; // 0 = понедельник недели, 2 = среда, 4 = пятница
    
    for (const dayOffset of daysOffset) {
      const workoutDate = new Date(weekStart);
      workoutDate.setDate(weekStart.getDate() + dayOffset);
      
      // Не создаём тренировки в прошлом
      const workoutDateOnly = new Date(workoutDate.getFullYear(), workoutDate.getMonth(), workoutDate.getDate());
      const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      if (workoutDateOnly < todayDateOnly) continue;
      
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

  async getUpcomingWorkouts(userId: number, limit: number = 5): Promise<UserWorkout[]> {
    return this.workoutRepository.getUserWorkouts(userId, limit);
  }

  async startWorkout(workoutId: number, userId: number): Promise<UserWorkout> {
    const userWorkout = await this.workoutRepository.getUserWorkoutById(workoutId);
    
    if (!userWorkout) {
      throw new Error('Тренировка не найдена');
    }
    
    if (userWorkout.userId !== userId) {
      throw new Error('Доступ запрещён');
    }
    
    if (!userWorkout.canStart()) {
      throw new Error('Тренировку нельзя начать');
    }
    
    await this.workoutRepository.startUserWorkout(workoutId);
    
    const updated = await this.workoutRepository.getUserWorkoutById(workoutId);
    if (!updated) throw new Error('Ошибка обновления тренировки');
    
    return updated;
  }

  async getWorkoutHistory(userId: number, limit: number = 10): Promise<UserWorkout[]> {
    return this.workoutRepository.getWorkoutHistory(userId, limit);
  }  
  async saveSetResult(
    workoutId: number, 
    userId: number, 
    exerciseId: number, 
    setResult: SetResult
  ): Promise<void> {
    const userWorkout = await this.workoutRepository.getUserWorkoutById(workoutId);
    
    if (!userWorkout || userWorkout.userId !== userId) {
      throw new Error('Доступ запрещён');
    }
    
    await this.workoutRepository.saveSetResult(workoutId, exerciseId, setResult);
  }

  async completeWorkout(
    workoutId: number, 
    userId: number, 
    wellnessRating?: number, 
    comments?: string
  ): Promise<void> {
    const userWorkout = await this.workoutRepository.getUserWorkoutById(workoutId);
    
    if (!userWorkout) {
      throw new Error('Тренировка не найдена');
    }
    
    if (userWorkout.userId !== userId) {
      throw new Error('Доступ запрещён');
    }
    
    const rating = wellnessRating || 3;
    
    await this.workoutRepository.updateUserWorkoutStatus(
      workoutId,
      WorkoutStatus.Completed,
      rating,
      comments
    );
    
    await this.adaptNextWorkout(userId, workoutId, rating);
  }

  private async adaptNextWorkout(userId: number, completedWorkoutId: number, wellnessRating: number): Promise<void> {
    const userWorkout = await this.workoutRepository.getUserWorkoutById(completedWorkoutId);
    if (!userWorkout) return;

    const user = await this.userRepository.findById(userId);
    if (!user) return;

    const upcomingWorkouts = await this.workoutRepository.getUserWorkouts(userId, 1);
    if (upcomingWorkouts.length === 0) return;

    const nextWorkout = upcomingWorkouts[0];

    // src/application/services/WorkoutService.ts (строки 136-148)

  for (const exercise of userWorkout.workout.exercises) {
    // ✅ Добавляем проверку на существование id
    if (!exercise.exercise.id) continue;
    
    const results = await this.workoutRepository.getExerciseResults(
      completedWorkoutId, 
      exercise.exercise.id // Теперь TypeScript знает, что это number
    );

    if (results.length === 0) continue;

    const allSuccessful = results.every(r => r.isSuccessful());
    const allExceeded = results.every(r => r.needsProgression());
    const anyFailed = results.some(r => r.needsRegression());

    const lastAdaptations = await this.workoutRepository.getUserAdaptations(
      userId, 
      exercise.exercise.id, // ✅ Теперь здесь тоже безопасно
      2
    );
  
      const consecutiveSuccess = lastAdaptations.length >= 2 && 
        lastAdaptations.every(a => a.adaptationType === AdaptationType.IncreaseWeight);

      let newWeight = exercise.targetWeight || this.calculateRecommendedWeight(user.weight, exercise.exercise.muscleGroup);
      let newRepsMin = exercise.repMin;
      let newRepsMax = exercise.repMax;
      let adaptationType: AdaptationType | null = null;
      let reason = '';

      if (wellnessRating < 3) {
        newWeight = Math.round(newWeight * 0.9);
        adaptationType = AdaptationType.DecreaseWeight;
        reason = `Низкая оценка самочувствия (${wellnessRating}/5)`;
      } else if (consecutiveSuccess && allSuccessful) {
        const increasePercent = 0.05 + (Math.random() * 0.05);
        newWeight = Math.round(newWeight * (1 + increasePercent));
        adaptationType = AdaptationType.IncreaseWeight;
        reason = `Успешное выполнение 2+ тренировок подряд (+${Math.round(increasePercent * 100)}%)`;
      } else if (allExceeded) {
        newRepsMin = Math.min(exercise.repMax, exercise.repMin + 2);
        newRepsMax = Math.min(exercise.repMax + 2, exercise.repMax + 2);
        adaptationType = AdaptationType.IncreaseReps;
        reason = 'Превышение целевых показателей по повторениям';
      } else if (anyFailed) {
        newWeight = Math.round(newWeight * 0.9);
        adaptationType = AdaptationType.DecreaseWeight;
        reason = 'Невыполнение целевого количества повторений';
      }

      if (adaptationType) {
        const adaptation = new WorkoutAdaptation({
          userId,
          exerciseId: exercise.exercise.id!,
          previousWeight: exercise.targetWeight || newWeight,
          newWeight,
          previousReps: exercise.repMin,
          newReps: newRepsMin,
          adaptationType,
          reason,
        });

        await this.workoutRepository.saveAdaptation(adaptation);
      }
    }
  }

  calculateRecommendedWeight(userWeight: number, exerciseType: string): number {
    const percentages: Record<string, number> = {
      'chest': 0.5,
      'back': 0.6,
      'legs': 0.75,
      'shoulders': 0.3,
      'core': 0,
    };
    
    const basePercentage = percentages[exerciseType] || 0.5;
    return Math.round(userWeight * basePercentage);
  }

  // src/application/services/WorkoutService.ts

async getCurrentWorkout(userId: number): Promise<UserWorkout | null> {
  //Получаем все предстоящие тренировки, отсортированные по дате
  const upcomingWorkouts = await this.workoutRepository.getUserWorkouts(userId, 10);
  
  // Находим первую тренировку со статусом scheduled или in_progress
  const workout = upcomingWorkouts.find(
    w => w.status === WorkoutStatus.Scheduled || w.status === WorkoutStatus.InProgress
  );
  
  if (!workout) return null;
  
  // Загружаем полную информацию с упражнениями
  const fullWorkout = await this.workoutRepository.getUserWorkoutById(workout.id!);
  if (!fullWorkout) return null;
  
  // Загружаем упражнения для тренировки
  const workoutWithExercises = await this.workoutRepository.getWorkoutById(fullWorkout.workout.id!);
  if (workoutWithExercises) {
    // Обновляем упражнения в объекте userWorkout
    (fullWorkout as any).workout.exercises = workoutWithExercises.exercises;
  }
  
  return fullWorkout;
}
}