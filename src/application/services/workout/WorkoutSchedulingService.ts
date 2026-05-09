import { UserWorkout, WorkoutStatus } from '../../../domain/entities/Workout';
import { IWorkoutRepository } from '../../../domain/interfaces/IWorkoutRepository';
import { IUserRepository } from '../../../domain/interfaces/IUserRepository';
import { InternalServerError, NotFoundError } from '../../../core/errors/ValidationError';

export class WorkoutSchedulingService {
  constructor(
    private workoutRepository: IWorkoutRepository,
    private userRepository: IUserRepository
  ) {}

  /** Генерирует базовую программу на 4 недели (12 тренировок: Пн/Ср/Пт) */
  async generateBaseProgram(userId: number): Promise<UserWorkout[]> {
    const splitPrograms = await this.workoutRepository.getSplitPrograms();
    if (splitPrograms.length < 3) {
      throw new InternalServerError('Не найдены программы для сплита (нужно 3: Грудь, Спина, Ноги)');
    }

    // Ротация: Пн – Грудь, Ср – Спина, Пт – Ноги
    const scheduleMap = [1, 2, 0];

    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError('Пользователь не найден');

    const scheduledWorkouts: UserWorkout[] = [];
    const today = new Date();
    const startDate = this.findNextMonday(today);
    const workoutTime = user.preferredWorkoutTime || '17:00';

    for (let week = 0; week < 4; week++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(startDate.getDate() + week * 7);

      for (let i = 0; i < 3; i++) {
        const workoutDate = new Date(weekStart);
        workoutDate.setDate(weekStart.getDate() + [0, 2, 4][i]);

        if (this.isDateInPast(workoutDate, today)) continue;

        const targetWorkout = splitPrograms[scheduleMap[i]];

        const userWorkout = new UserWorkout({
          userId,
          workout: targetWorkout,
          scheduledDate: workoutDate,
          scheduledTime: workoutTime,
          status: WorkoutStatus.Scheduled,
        });

        const saved = await this.workoutRepository.createUserWorkout(userWorkout);
        scheduledWorkouts.push(saved);
      }
    }

    return scheduledWorkouts;
  }

  /** Генерирует дополнительные тренировки, если не хватает */
  async generateAdditionalWorkouts(userId: number, count: number): Promise<void> {
    const splitPrograms = await this.workoutRepository.getSplitPrograms();
    if (splitPrograms.length < 3) return;

    const lastWorkout = await this.workoutRepository.getUserWorkouts(userId, 1);
    let startDate = lastWorkout.length > 0
      ? this.findNextTrainingDay(new Date(lastWorkout[0].scheduledDate))
      : this.findNextMonday(new Date());

    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError('Пользователь не найден');

    for (let i = 0; i < count; i++) {
      const workoutDate = this.findNextTrainingDay(startDate);
      const programIndex = this.getProgramIndexByDay(workoutDate.getDay());
      const targetWorkout = splitPrograms[programIndex];

      await this.workoutRepository.createUserWorkout(
        new UserWorkout({
          userId,
          workout: targetWorkout,
          scheduledDate: workoutDate,
          scheduledTime: user.preferredWorkoutTime || '17:00',
          status: WorkoutStatus.Scheduled,
        })
      );

      // Сдвигаем на 2 дня вперёд для следующего поиска
      startDate.setDate(startDate.getDate() + 2);
    }
  }

  // ---------- Приватные хелперы ----------

  private findNextMonday(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const daysUntilMonday = day === 0 ? 1 : (8 - day) % 7;
    result.setDate(result.getDate() + (day === 1 ? 0 : daysUntilMonday));
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private findNextTrainingDay(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    if ([1, 3, 5].includes(day)) return result;
    const shifts: Record<number, number> = { 0: 1, 2: 1, 4: 1, 6: 2 };
    result.setDate(result.getDate() + (shifts[day] || 1));
    return result;
  }

  private getProgramIndexByDay(dayOfWeek: number): number {
    const map: Record<number, number> = { 1: 1, 3: 2, 5: 0 };
    return map[dayOfWeek] ?? 0;
  }

  private isDateInPast(workoutDate: Date, today: Date): boolean {
    const d1 = new Date(workoutDate.getFullYear(), workoutDate.getMonth(), workoutDate.getDate());
    const d2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return d1 < d2;
  }
}