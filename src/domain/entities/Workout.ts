export enum WorkoutStatus {
  Scheduled = 'scheduled',
  Completed = 'completed',
  Skipped = 'skipped',
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

  constructor(data: {
    exercise: Exercise;
    sets: number;
    repMin: number;
    repMax: number;
    restSeconds: number;
    orderIndex: number;
  }) {
    this.exercise = data.exercise;
    this.sets = data.sets;
    this.repMin = data.repMin;
    this.repMax = data.repMax;
    this.restSeconds = data.restSeconds;
    this.orderIndex = data.orderIndex;
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
  }

  // Метод для проверки, можно ли начать тренировку
  public canStart(): boolean {
    return this.status === WorkoutStatus.Scheduled;
  }
}