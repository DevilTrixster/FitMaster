import { IWorkoutRepository } from '../../../domain/interfaces/IWorkoutRepository';
import { IUserRepository } from '../../../domain/interfaces/IUserRepository';
import { UserWorkout, WorkoutStatus } from '../../../domain/entities/Workout';

export class WorkoutSchedulingService {
  constructor(
    private workoutRepository: IWorkoutRepository,
    private userRepository: IUserRepository
  ) {}

  async generateBaseProgram(userId: number): Promise<UserWorkout[]> {
    let preferredDays = await this.userRepository.getPreferredDays(userId);
    if (!preferredDays.length) {
      preferredDays = [1, 3, 5];
      await this.userRepository.updatePreferredDays(userId, preferredDays);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await this.workoutRepository.deleteScheduledWorkoutsFrom(userId, today);

    const workouts = await this.generateWorkoutsForDays(userId, preferredDays, 4);
    await this.workoutRepository.createUserWorkoutBatch(workouts);
    return workouts;
  }

  async regenerateFutureWorkouts(userId: number, days: number[]): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await this.workoutRepository.deleteScheduledWorkoutsFrom(userId, today);
    const workouts = await this.generateWorkoutsForDays(userId, days, 6);
    if (workouts.length) {
      await this.workoutRepository.createUserWorkoutBatch(workouts);
    }
  }

  async generateAdditionalWorkouts(userId: number, count: number = 5): Promise<void> {
    const preferredDays = await this.userRepository.getPreferredDays(userId);
    if (!preferredDays.length) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = await this.workoutRepository.getUserWorkouts(userId, count);
    const upcoming = existing.filter(w => w.status === WorkoutStatus.Scheduled && new Date(w.scheduledDate) >= today);
    if (upcoming.length >= count) return;

    const workouts = await this.generateWorkoutsForDays(userId, preferredDays, 4);
    await this.workoutRepository.createUserWorkoutBatch(workouts);
  }

  //Исправленная генерация: для каждого из выбранных дней недели (1=Пн...7=Вс) создаёт тренировку на ближайшую дату, начиная с today, и повторяет weeksCount недель.
  private async generateWorkoutsForDays(
    userId: number,
    days: number[],
    weeksCount: number
  ): Promise<UserWorkout[]> {
    if (!days.length) return [];

    const sortedDays = [...days].sort((a, b) => a - b);
    console.log(`🏋️ Generating workouts for days: ${sortedDays.join(', ')}`);

    const splitPrograms = await this.workoutRepository.getSplitPrograms();
    if (!splitPrograms.length) throw new Error('Нет программ тренировок');

    const user = await this.userRepository.findById(userId);
    const defaultTime = user?.preferredWorkoutTime || '17:00';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    console.log(`📅 Сегодня (today) = ${today.toISOString().slice(0,10)}, день недели: ${today.getDay()} (0=Вс,1=Пн,...)`);

    // Функция приведения дня недели к формату 1=Пн...7=Вс
    const toNormDay = (date: Date) => {
      const d = date.getDay();
      return d === 0 ? 7 : d;
    };

    const result: UserWorkout[] = [];

    for (let week = 0; week < weeksCount; week++) {
      // Базовая дата для текущей недели: today + 7*week дней
      const baseDate = new Date(today);
      baseDate.setDate(today.getDate() + week * 7);
      console.log(`  Неделя ${week}: baseDate = ${baseDate.toISOString().slice(0,10)} (нормализованный день = ${toNormDay(baseDate)})`);

      for (let idx = 0; idx < sortedDays.length; idx++) {
        const targetDay = sortedDays[idx];
        // Вычисляем разницу между целевым днём и текущим днём недели baseDate
        let diff = targetDay - toNormDay(baseDate);
        if (diff < 0) diff += 7;
        const targetDate = new Date(baseDate);
        targetDate.setDate(baseDate.getDate() + diff);
        console.log(`    Целевой день ${targetDay} → дата ${targetDate.toISOString().slice(0,10)} (норм. день ${toNormDay(targetDate)})`);

        // Пропускаем только если дата строго раньше today
        if (targetDate < today) continue;

        const programIndex = (week * sortedDays.length + idx) % splitPrograms.length;
        const program = splitPrograms[programIndex];
        result.push(new UserWorkout({
          userId,
          workout: program,
          scheduledDate: targetDate,
          scheduledTime: defaultTime,
          status: WorkoutStatus.Scheduled,
        }));
      }
    }

    console.log(`📆 Итоговые даты:`, result.map(w => w.scheduledDate.toISOString().slice(0,10)));
    return result;
  }
}