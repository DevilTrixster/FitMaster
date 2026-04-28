export enum WorkoutStatus {
  Scheduled = 'scheduled',
  InProgress = 'in_progress',
  Completed = 'completed',
  Skipped = 'skipped',
  Rescheduled = 'rescheduled',
}

export enum AdaptationType {
  IncreaseWeight = 'increase_weight',
  DecreaseWeight = 'decrease_weight',
  IncreaseReps = 'increase_reps',
  DecreaseReps = 'decrease_reps',
  NoChange = 'no_change',
  Substitution = 'substitution',
}

export class Exercise {
  public readonly id?: number;
  public readonly name: string;
  public readonly description: string;
  public readonly muscleGroup: string;
  public readonly equipmentType: string;

  constructor(data: {
    id?: number;
    name: string;
    description: string;
    muscleGroup: string;
    equipmentType: string;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.muscleGroup = data.muscleGroup;
    this.equipmentType = data.equipmentType;
  }
}

export class WorkoutExercise {
  public readonly exercise: Exercise;
  public readonly sets: number;
  public readonly repMin: number;
  public readonly repMax: number;
  public readonly restSeconds: number;
  public readonly orderIndex: number;
  public readonly targetWeight?: number;

  constructor(data: {
    exercise: Exercise;
    sets: number;
    repMin: number;
    repMax: number;
    restSeconds: number;
    orderIndex: number;
    targetWeight?: number;
  }) {
    this.exercise = data.exercise;
    this.sets = data.sets;
    this.repMin = data.repMin;
    this.repMax = data.repMax;
    this.restSeconds = data.restSeconds;
    this.orderIndex = data.orderIndex;
    this.targetWeight = data.targetWeight;
  }
}

export class SetResult {
  public readonly setNumber: number;
  public readonly targetReps: number;
  public readonly targetWeight?: number;
  public readonly actualReps?: number;
  public readonly actualWeight?: number;
  public readonly completed: boolean;
  public readonly skipped: boolean;
  public readonly completedAt?: Date;
  public readonly notes?: string;

  constructor(data: {
    setNumber: number;
    targetReps: number;
    targetWeight?: number;
    actualReps?: number;
    actualWeight?: number;
    completed: boolean;
    skipped?: boolean;
    completedAt?: Date;
    notes?: string;
  }) {
    this.setNumber = data.setNumber;
    this.targetReps = data.targetReps;
    this.targetWeight = data.targetWeight;
    this.actualReps = data.actualReps;
    this.actualWeight = data.actualWeight;
    this.completed = data.completed;
    this.skipped = data.skipped || false;
    this.completedAt = data.completedAt;
    this.notes = data.notes;
  }

  /**
   * Проверка успешности выполнения подхода
   * Успешен только если выполнен и достигнут целевой показатель
   */
  public isSuccessful(): boolean {
    if (this.skipped || !this.completed) return false;
    if (this.actualReps === undefined || this.actualReps === null) return false;
    return this.actualReps >= this.targetReps;
  }

  /**
   * Нужно ли увеличивать нагрузку (превышение цели)
   */
  public needsProgression(): boolean {
    if (this.skipped || !this.completed) return false;
    if (this.actualReps === undefined || this.actualReps === null) return false;
    return this.actualReps > this.targetReps + 2;
  }

  /**
   * Нужно ли снижать нагрузку (невыполнение цели)
   * Пропущенный подход считается как неудача
   */
  public needsRegression(): boolean {
    if (this.skipped) return true; // Пропуск = регрессия
    if (!this.completed) return false;
    if (this.actualReps === undefined || this.actualReps === null) return false;
    return this.actualReps < this.targetReps * 0.8; // Меньше 80% от цели
  }
}

export class WorkoutExerciseResult {
  public readonly workoutExercise: WorkoutExercise;
  public readonly sets: SetResult[];
  public readonly comments?: string;

  constructor(data: {
    workoutExercise: WorkoutExercise;
    sets: SetResult[];
    comments?: string;
  }) {
    this.workoutExercise = data.workoutExercise;
    this.sets = data.sets;
    this.comments = data.comments;
  }

  /**
   * Все ли подходы выполнены успешно
   */
  public getAllSetsSuccessful(): boolean {
    return this.sets.every(set => set.isSuccessful());
  }

  /**
   * Процент успешных подходов
   */
  public getSuccessRate(): number {
    if (this.sets.length === 0) return 0;
    const successful = this.sets.filter(set => set.isSuccessful()).length;
    return (successful / this.sets.length) * 100;
  }

  /**
   * Сколько подходов пропущено
   */
  public getSkippedCount(): number {
    return this.sets.filter(set => set.skipped).length;
  }
}

export class Workout {
  public readonly id?: number;
  public readonly name: string;
  public readonly description: string;
  public readonly frequencyPerWeek: number;
  public readonly exercises: WorkoutExercise[];

  constructor(data: {
    id?: number;
    name: string;
    description: string;
    frequencyPerWeek: number;
    exercises?: WorkoutExercise[];
  }) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.frequencyPerWeek = data.frequencyPerWeek;
    this.exercises = data.exercises || [];
  }
}

export class UserWorkout {
  public readonly id?: number;
  public readonly userId: number;
  public readonly workout: Workout;
  public readonly scheduledDate: Date;
  public readonly scheduledTime?: string;
  public readonly status: WorkoutStatus;
  public readonly completedAt?: Date;
  public readonly wellnessRating?: number;
  public readonly comments?: string;
  public readonly exerciseResults?: WorkoutExerciseResult[];
  public readonly startedAt?: Date;
  public readonly pausedAt?: Date;
  public readonly lastExerciseIndex?: number;
  public readonly rescheduledTo?: Date;
  public readonly rescheduleReason?: string;

  constructor(data: {
    id?: number;
    userId: number;
    workout: Workout;
    scheduledDate: Date;
    scheduledTime?: string;
    status: WorkoutStatus;
    completedAt?: Date;
    wellnessRating?: number;
    comments?: string;
    startedAt?: Date;
    pausedAt?: Date;
    lastExerciseIndex?: number;
    exerciseResults?: WorkoutExerciseResult[];
    rescheduledTo?: Date;
    rescheduleReason?: string;
  }) {
    this.id = data.id;
    this.userId = data.userId;
    this.workout = data.workout;
    this.scheduledDate = data.scheduledDate;
    this.scheduledTime = data.scheduledTime;
    this.status = data.status;
    this.completedAt = data.completedAt;
    this.wellnessRating = data.wellnessRating;
    this.comments = data.comments;
    this.exerciseResults = data.exerciseResults;
    this.startedAt = data.startedAt;
    this.pausedAt = data.pausedAt;
    this.lastExerciseIndex = data.lastExerciseIndex;
    this.rescheduledTo = data.rescheduledTo;
    this.rescheduleReason = data.rescheduleReason;
  }

  public canStart(): boolean {
    return this.status === WorkoutStatus.Scheduled;
  }

  public isInProgress(): boolean {
    return this.status === WorkoutStatus.InProgress;
  }

  public isPaused(): boolean {
    return this.status === WorkoutStatus.InProgress && this.pausedAt !== undefined;
  }

  public canResume(): boolean {
    return this.status === WorkoutStatus.InProgress;
  }
}

export class WorkoutAdaptation {
  public readonly id?: number;
  public readonly userId: number;
  public readonly exerciseId: number;
  public readonly previousWeight: number;
  public readonly newWeight: number;
  public readonly previousReps: number;
  public readonly newReps: number;
  public readonly adaptationType: AdaptationType;
  public readonly reason: string;

  constructor(data: {
    id?: number;
    userId: number;
    exerciseId: number;
    previousWeight: number;
    newWeight: number;
    previousReps: number;
    newReps: number;
    adaptationType: AdaptationType;
    reason: string;
  }) {
    this.id = data.id;
    this.userId = data.userId;
    this.exerciseId = data.exerciseId;
    this.previousWeight = data.previousWeight;
    this.newWeight = data.newWeight;
    this.previousReps = data.previousReps;
    this.newReps = data.newReps;
    this.adaptationType = data.adaptationType;
    this.reason = data.reason;
  }
}