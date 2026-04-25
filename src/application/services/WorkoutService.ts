import { Workout, UserWorkout, WorkoutStatus, SetResult, WorkoutAdaptation, AdaptationType, WorkoutExerciseResult, Exercise } from '../../domain/entities/Workout';
import { IWorkoutRepository } from '../../domain/interfaces/IWorkoutRepository';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { WorkoutAdaptationService } from './WorkoutAdaptationService';

export class WorkoutService {
  constructor(
    private workoutRepository: IWorkoutRepository,
    private userRepository: IUserRepository,
    private adaptationService: WorkoutAdaptationService
  ) {}

  async generateBaseProgram(userId: number): Promise<UserWorkout[]> {
    const splitPrograms = await this.workoutRepository.getSplitPrograms();
    if (splitPrograms.length < 3) {
      throw new Error('Не найдены программы для сплита (нужно 3: Грудь, Спина, Ноги)');
    }

    // Индексы программ в массиве splitPrograms (зависит от ORDER BY id ASC в репозитории)
    // splitPrograms[0] -> ID 1 (Ноги)
    // splitPrograms[1] -> ID 2 (Грудь)
    // splitPrograms[2] -> ID 3 (Спина)
    
    // Наша логика ротации:
    // День 0 (Пн) -> Грудь (index 1)
    // День 1 (Ср) -> Спина (index 2)
    // День 2 (Пт) -> Ноги (index 0)
    const scheduleMap = [1, 2, 0]; 

    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error('Пользователь не найден');

    const scheduledWorkouts: UserWorkout[] = [];
    const today = new Date();
    const startDate = new Date(today);

    // Находим ближайший понедельник
    const dayOfWeek = startDate.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
    startDate.setDate(startDate.getDate() + (dayOfWeek === 1 ? 0 : daysUntilMonday));
    startDate.setHours(10, 0, 0, 0);

    // Генерируем на 4 недели
    for (let week = 0; week < 4; week++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(startDate.getDate() + (week * 7));

      // 0, 2, 4 — это смещения для Пн, Ср, Пт внутри недели
      const daysOffset = [0, 2, 4];

      for (let i = 0; i < daysOffset.length; i++) {
        const workoutDate = new Date(weekStart);
        workoutDate.setDate(weekStart.getDate() + daysOffset[i]);

        // Проверка на прошлое
        const workoutDateOnly = new Date(workoutDate.getFullYear(), workoutDate.getMonth(), workoutDate.getDate());
        const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (workoutDateOnly < todayDateOnly) continue;

        // ✅ Выбираем программу на основе индекса дня (0, 1 или 2)
        const programIndex = scheduleMap[i];
        const targetWorkout = splitPrograms[programIndex];

        const userWorkout = new UserWorkout({
          userId,
          workout: targetWorkout, // ✅ Используем конкретную программу (Грудь/Спина/Ноги)
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
    console.log('📅 getUpcomingWorkouts: userId=', userId, 'limit=', limit);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingWorkouts = await this.workoutRepository.getUserWorkouts(userId, 20);
    console.log('📥 Получено из БД:', upcomingWorkouts.length, 'тренировок');

    // Помечаем просроченные как пропущенные
    for (const workout of upcomingWorkouts) {
      const workoutDate = new Date(workout.scheduledDate);
      workoutDate.setHours(0, 0, 0, 0);
      
      if (workoutDate < today && workout.status === WorkoutStatus.Scheduled) {
        console.log('⏰ Пропускаем устаревшую тренировку:', workout.id, workout.scheduledDate);
        await this.workoutRepository.updateUserWorkoutStatus(
          workout.id!,
          WorkoutStatus.Skipped,
          undefined,
          'Автоматически пропущена (дата прошла)'
        );
      }
    }

    // Фильтруем только запланированные и активные
    const filtered = upcomingWorkouts.filter(w => 
      w.status === WorkoutStatus.Scheduled || w.status === WorkoutStatus.InProgress
    );

    console.log('✅ После фильтрации:', filtered.length, 'тренировок');

    // ✅ ИСПРАВЛЕНИЕ: не рекурсия, а просто возврат того что есть
    if (filtered.length === 0) {
      console.log('⚠️ Нет предстоящих тренировок. Генерируем новые...');
      await this.generateAdditionalWorkouts(userId, 5);
      // Получаем только что созданные
      const newWorkouts = await this.workoutRepository.getUserWorkouts(userId, 5);
      return newWorkouts.filter(w => 
        w.status === WorkoutStatus.Scheduled || w.status === WorkoutStatus.InProgress
      );
    }

    return filtered.slice(0, limit);
  }

  async generateAdditionalWorkouts(userId: number, count: number): Promise<void> {
    const splitPrograms = await this.workoutRepository.getSplitPrograms();
    if (splitPrograms.length < 3) return;
    
    const lastWorkout = await this.workoutRepository.getUserWorkouts(userId, 1);
    let startDate = new Date();

    if (lastWorkout.length > 0) {
      startDate = new Date(lastWorkout[0].scheduledDate);
      startDate.setDate(startDate.getDate() + 2);
    }

    // Находим следующий понедельник, среду или пятницу
    for (let i = 0; i < count; i++) {
      const workoutDate = new Date(startDate);
      const dayOfWeek = workoutDate.getDay();
      
      // Корректируем до ближайшего Пн/Ср/Пт
      if (dayOfWeek === 0) workoutDate.setDate(workoutDate.getDate() + 1); // Вс -> Пн
      else if (dayOfWeek === 2) workoutDate.setDate(workoutDate.getDate() + 1); // Вт -> Ср
      else if (dayOfWeek === 4) workoutDate.setDate(workoutDate.getDate() + 1); // Чт -> Пт
      else if (dayOfWeek === 6) workoutDate.setDate(workoutDate.getDate() + 2); // Сб -> Пн
      
      // ✅ Выбираем программу на основе дня недели
      let programIndex = 0;
      const adjustedDay = workoutDate.getDay();
      if (adjustedDay === 1) programIndex = 1; // Пн -> Грудь
      else if (adjustedDay === 3) programIndex = 2; // Ср -> Спина
      else if (adjustedDay === 5) programIndex = 0; // Пт -> Ноги
      
      const targetWorkout = splitPrograms[programIndex];

      const userWorkout = new UserWorkout({
        userId,
        workout: targetWorkout, // ✅ Используем конкретную программу
        scheduledDate: workoutDate,
        scheduledTime: '10:00',
        status: WorkoutStatus.Scheduled,
      });
      
      await this.workoutRepository.createUserWorkout(userWorkout);
      startDate.setDate(startDate.getDate() + 2);
    }
  }

  async startWorkout(workoutId: number, userId: number): Promise<UserWorkout> {
    // 🔥 ЗАЩИТА: Проверяем, нет ли уже активной тренировки у пользователя
    const activeWorkout = await this.workoutRepository.getUserActiveWorkout(userId);
    if (activeWorkout && activeWorkout.id !== workoutId) {
      console.log(`⚠️ Автозавершение старой тренировки #${activeWorkout.id} при начале новой`);
      await this.workoutRepository.updateUserWorkoutStatus(
        activeWorkout.id!,
        WorkoutStatus.Completed,
        3,
        'Автоматически завершена при начале новой тренировки'
      );
    }

    const userWorkout = await this.workoutRepository.getUserWorkoutById(workoutId);
    if (!userWorkout) throw new Error('Тренировка не найдена');
    if (userWorkout.userId !== userId) throw new Error('Доступ запрещён');
    if (!userWorkout.canStart()) throw new Error('Тренировку нельзя начать');

    await this.workoutRepository.startUserWorkout(workoutId);

    const updated = await this.workoutRepository.getUserWorkoutById(workoutId);
    if (!updated) throw new Error('Ошибка обновления тренировки');

    return updated;
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
    
    await this.runAdaptationLogic(userId, workoutId, wellnessRating || 3);
  }

  private async runAdaptationLogic(userId: number, completedWorkoutId: number, wellnessRating: number): Promise<void> {
    const userWorkout = await this.workoutRepository.getUserWorkoutById(completedWorkoutId);
    if (!userWorkout) return;

    // Проходим по каждому упражнению в завершенной тренировке
    for (const exercise of userWorkout.workout.exercises) {
      if (!exercise.exercise.id) continue;

      // Получаем результаты подходов
      const results = await this.workoutRepository.getExerciseResults(completedWorkoutId, exercise.exercise.id);
      
      // Вызываем наш умный сервис адаптации
      await this.adaptationService.adaptExercise(
        userId,
        completedWorkoutId,
        exercise,
        wellnessRating,
        results
      );
    }
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

  async getWorkoutHistory(
  userId: number, 
  limit: number, 
  offset: number,
  status?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<UserWorkout[]> {
  return this.workoutRepository.getWorkoutHistory(
    userId, 
    limit, 
    offset,
    status,
    dateFrom,
    dateTo
  );
  }

  async pauseWorkout(workoutId: number, userId: number, lastExerciseIndex: number): Promise<void> {
    const userWorkout = await this.workoutRepository.getUserWorkoutById(workoutId);
    
    if (!userWorkout || userWorkout.userId !== userId) {
      throw new Error('Тренировка не найдена или доступ запрещён');
    }
    
    if (userWorkout.status !== WorkoutStatus.InProgress) {
      throw new Error('Нельзя поставить на паузу незавершённую тренировку');
    }
    
    await this.workoutRepository.pauseUserWorkout(workoutId, lastExerciseIndex);
  }

  async resumeWorkout(workoutId: number, userId: number): Promise<void> {
    const userWorkout = await this.workoutRepository.getUserWorkoutById(workoutId);
    
    if (!userWorkout || userWorkout.userId !== userId) {
      throw new Error('Тренировка не найдена или доступ запрещён');
    }
    
    await this.workoutRepository.resumeUserWorkout(workoutId);
  }

  async getActiveWorkout(userId: number): Promise<UserWorkout | null> {
    return this.workoutRepository.getUserActiveWorkout(userId);
  }

  async getCurrentWorkout(userId: number): Promise<UserWorkout | null> {
    // Получаем все предстоящие тренировки
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
      (fullWorkout as any).workout.exercises = workoutWithExercises.exercises;
    }
    
    return fullWorkout;
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

  console.log('💾 WorkoutService: сохраняем результат в БД...');
  await this.workoutRepository.saveSetResult(workoutId, exerciseId, setResult);
  }

  async getAllExercises(): Promise<Exercise[]> {
    return await this.workoutRepository.getAllExercises();
  }

  async getExerciseSubstitutions(userId: number): Promise<{
    originalExercise: Exercise;
    alternativeExercise: Exercise;
    reason: string;
    suggestedAt: Date;
  }[]> {
    const substitutions = await this.workoutRepository.getUserExerciseSubstitutions(userId);
    
    const result = [];
    for (const sub of substitutions) {
      const original = await this.workoutRepository.getExerciseById(sub.originalExerciseId);
      const alternative = await this.workoutRepository.getExerciseById(sub.alternativeExerciseId);
      
      if (original && alternative) {
        result.push({
          originalExercise: original,
          alternativeExercise: alternative,
          reason: sub.reason,
          suggestedAt: sub.suggestedAt,
        });
      }
    }
    
    return result;
  }
}