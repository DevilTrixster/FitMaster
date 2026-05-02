import { UserWorkout, WorkoutStatus } from '../../../domain/entities/Workout';
import { IWorkoutRepository } from '../../../domain/interfaces/IWorkoutRepository';
import { IUserRepository } from '../../../domain/interfaces/IUserRepository';

/**
 * Генерация и планирование тренировок
 * 
 * Этот сервис знает:
 * - как распределять программы по дням (Пн/Ср/Пт)
 * - как учитывать предпочтительное время пользователя
 * - как избегать создания тренировок в прошлом
 * 
 * НЕ знает:
 * - как начинать/завершать тренировки
 * - как адаптировать нагрузку
 * - как читать историю
 */
export class WorkoutSchedulingService {
  constructor(
    private workoutRepository: IWorkoutRepository,
    private userRepository: IUserRepository
  ) {}

  /**
   * Генерирует базовую программу на 4 недели (12 тренировок: Пн/Ср/Пт)
   */
  async generateBaseProgram(userId: number): Promise<UserWorkout[]> {
    const splitPrograms = await this.workoutRepository.getSplitPrograms();
    if (splitPrograms.length < 3) {
      throw new Error('Не найдены программы для сплита (нужно 3: Грудь, Спина, Ноги)');
    }

    // Логика ротации: [Пн→Грудь, Ср→Спина, Пт→Ноги]
    const scheduleMap = [1, 2, 0]; // индексы в массиве splitPrograms

    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error('Пользователь не найден');

    const scheduledWorkouts: UserWorkout[] = [];
    const today = new Date();
    const startDate = this.findNextMonday(today);
    const workoutTime = this.parseWorkoutTime(user.preferredWorkoutTime || '17:00');

    for (let week = 0; week < 4; week++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(startDate.getDate() + week * 7);

      for (let i = 0; i < 3; i++) { // Пн, Ср, Пт
        const workoutDate = new Date(weekStart);
        workoutDate.setDate(weekStart.getDate() + [0, 2, 4][i]);

        // Пропускаем даты в прошлом
        if (this.isDateInPast(workoutDate, today)) continue;

        const programIndex = scheduleMap[i];
        const targetWorkout = splitPrograms[programIndex];

        const userWorkout = new UserWorkout({
          userId,
          workout: targetWorkout,
          scheduledDate: workoutDate,
          scheduledTime: user.preferredWorkoutTime || '17:00',
          status: WorkoutStatus.Scheduled,
        });

        const saved = await this.workoutRepository.createUserWorkout(userWorkout);
        scheduledWorkouts.push(saved);
      }
    }

    return scheduledWorkouts;
  }

  /**
   * Генерирует дополнительные тренировки, если их не хватает
   */
  async generateAdditionalWorkouts(userId: number, count: number): Promise<void> {
    const splitPrograms = await this.workoutRepository.getSplitPrograms();
    if (splitPrograms.length < 3) return;

    const lastWorkout = await this.workoutRepository.getUserWorkouts(userId, 1);
    let startDate = lastWorkout.length > 0 
      ? this.findNextTrainingDay(new Date(lastWorkout[0].scheduledDate))
      : this.findNextMonday(new Date());

    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error('Пользователь не найден');

    for (let i = 0; i < count; i++) {
      const workoutDate = this.findNextTrainingDay(startDate);
      const programIndex = this.getProgramIndexByDay(workoutDate.getDay());
      const targetWorkout = splitPrograms[programIndex];

      const userWorkout = new UserWorkout({
        userId,
        workout: targetWorkout,
        scheduledDate: workoutDate,
        scheduledTime: user.preferredWorkoutTime || '17:00',
        status: WorkoutStatus.Scheduled,
      });

      await this.workoutRepository.createUserWorkout(userWorkout);
      // Смещаемся на 2 дня вперёд для поиска следующей даты
      startDate.setDate(startDate.getDate() + 2);
    }
  }

  // ========== Вспомогательные методы (приватные) ==========

  /**
   * Находит ближайший понедельник (или возвращает сегодня, если уже понедельник)
   */
  private findNextMonday(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const daysUntilMonday = day === 0 ? 1 : (8 - day) % 7;
    result.setDate(result.getDate() + (day === 1 ? 0 : daysUntilMonday));
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * Находит ближайший день для тренировки (Пн/Ср/Пт)
   */
  private findNextTrainingDay(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    
    // Если уже Пн/Ср/Пт — оставляем как есть, иначе сдвигаем вперёд
    if ([1, 3, 5].includes(day)) return result;
    
    // Сдвиги: Вс→Пн(+1), Вт→Ср(+1), Чт→Пт(+1), Сб→Пн(+2)
    const shifts: Record<number, number> = { 0: 1, 2: 1, 4: 1, 6: 2 };
    result.setDate(result.getDate() + (shifts[day] || 1));
    return result;
  }

  /**
   * Возвращает индекс программы по дню недели
   * Пн(1)→Грудь(1), Ср(3)→Спина(2), Пт(5)→Ноги(0)
   */
  private getProgramIndexByDay(dayOfWeek: number): number {
    const map: Record<number, number> = { 1: 1, 3: 2, 5: 0 };
    return map[dayOfWeek] ?? 0;
  }

  /**
   * Проверяет, является ли дата в прошлом (по дню, игнорируя время)
   */
  private isDateInPast(workoutDate: Date, today: Date): boolean {
    const d1 = new Date(workoutDate.getFullYear(), workoutDate.getMonth(), workoutDate.getDate());
    const d2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return d1 < d2;
  }

  /**
   * Парсит строку времени 'HH:MM' в часы и минуты
   */
  private parseWorkoutTime(timeStr: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
  }
}