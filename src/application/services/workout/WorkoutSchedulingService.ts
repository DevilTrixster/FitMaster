import { IWorkoutRepository } from '../../../domain/interfaces/IWorkoutRepository';
import { IUserRepository } from '../../../domain/interfaces/IUserRepository';
import { UserWorkout, WorkoutStatus } from '../../../domain/entities/Workout';

export class WorkoutSchedulingService {
  constructor(
    private workoutRepository: IWorkoutRepository,
    private userRepository: IUserRepository
  ) {}

  /**
   * Генерация базовой программы на 4 недели при регистрации
   * (использует предпочтительные дни пользователя или по умолчанию ПН,СР,ПТ)
   */
  async generateBaseProgram(userId: number): Promise<UserWorkout[]> {
    // Получаем предпочтительные дни пользователя (если нет – по умолчанию 1,3,5)
    let preferredDays = await this.userRepository.getPreferredDays(userId);
    if (!preferredDays.length) {
      preferredDays = [1, 3, 5]; // ПН, СР, ПТ
      await this.userRepository.updatePreferredDays(userId, preferredDays);
    }

    // Удаляем все будущие тренировки, начиная с сегодня
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await this.workoutRepository.deleteScheduledWorkoutsFrom(userId, today);

    // Генерируем на 4 недели вперёд
    const workouts = await this.generateWorkoutsForDays(userId, preferredDays, 4);
    await this.workoutRepository.createUserWorkoutBatch(workouts);
    return workouts;
  }

  /**
   * Регенерация расписания после смены предпочтительных дней
   * @param userId 
   * @param days массив чисел от 1 (ПН) до 7 (ВС)
   */
  async regenerateFutureWorkouts(userId: number, days: number[]): Promise<void> {
    // Удаляем все будущие запланированные тренировки (начиная с сегодня)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await this.workoutRepository.deleteScheduledWorkoutsFrom(userId, today);

    // Генерируем новые на 6 недель вперёд
    const workouts = await this.generateWorkoutsForDays(userId, days, 6);
    if (workouts.length) {
      await this.workoutRepository.createUserWorkoutBatch(workouts);
    }
  }

  /**
   * Дополнительная генерация, если в ближайшее время нет тренировок
   */
  async generateAdditionalWorkouts(userId: number, count: number = 5): Promise<void> {
    const preferredDays = await this.userRepository.getPreferredDays(userId);
    if (!preferredDays.length) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Проверяем, есть ли уже запланированные тренировки
    const existing = await this.workoutRepository.getUserWorkouts(userId, count);
    const upcoming = existing.filter(w => w.status === WorkoutStatus.Scheduled && new Date(w.scheduledDate) >= today);
    if (upcoming.length >= count) return;

    // Генерируем недостающие
    const workouts = await this.generateWorkoutsForDays(userId, preferredDays, 4);
    await this.workoutRepository.createUserWorkoutBatch(workouts);
  }

  /**
   * Основная логика: создание объектов UserWorkout для заданных дней на N недель
   */
  private async generateWorkoutsForDays(
    userId: number,
    days: number[],      // [2,4,6] для Вт, Чт, Сб
    weeksCount: number
  ): Promise<UserWorkout[]> {
    if (!days.length) return [];

    days.sort((a,b) => a-b);  // [2,4,6]

    const splitPrograms = await this.workoutRepository.getSplitPrograms();
    if (!splitPrograms.length) throw new Error('Нет программ');

    const user = await this.userRepository.findById(userId);
    const defaultTime = user?.preferredWorkoutTime || '17:00';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result: UserWorkout[] = [];

    // Дата начала: сегодня (не раньше)
    let startDate = new Date(today);

    for (let week = 0; week < weeksCount; week++) {
      for (let idx = 0; idx < days.length; idx++) {
        const targetDay = days[idx];
        // Вычисляем дату: идём от startDate, прибавляем неделю если нужно
        let date = new Date(startDate);
        date.setDate(startDate.getDate() + week * 7);
        // Находим ближайший targetDay (1=ПН ... 7=ВС)
        let currentDayNum = date.getDay(); // 0=ВС,1=ПН,...6=СБ
        if (currentDayNum === 0) currentDayNum = 7;
        let diff = targetDay - currentDayNum;
        if (diff < 0) diff += 7;
        date.setDate(date.getDate() + diff);
        // Пропускаем, если дата уже прошла (но сегодня можно)
        if (date < today) continue;

        // Циклический выбор программы
        const programIndex = (week * days.length + idx) % splitPrograms.length;
        const program = splitPrograms[programIndex];

        result.push(new UserWorkout({
          userId,
          workout: program,
          scheduledDate: date,
          scheduledTime: defaultTime,
          status: WorkoutStatus.Scheduled,
        }));
      }
    }
    return result;
  }
}