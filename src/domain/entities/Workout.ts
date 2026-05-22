export enum WorkoutStatus {
  Scheduled = 'scheduled',
  InProgress = 'in_progress',
  Completed = 'completed',
  Skipped = 'skipped',
  Rescheduled = 'rescheduled',
}
export enum MetricType {
    Reps = 'reps',
    Weight = 'weight',
    Duration = 'duration',
    Distance = 'distance',
    Calories = 'calories',
    Incline = 'incline',
    Resistance = 'resistance',
}
export enum AdaptationType {
  IncreaseWeight = 'increase_weight',
  DecreaseWeight = 'decrease_weight',
  IncreaseReps = 'increase_reps',
  DecreaseReps = 'decrease_reps',
  NoChange = 'no_change',
  Substitution = 'substitution',
}

export interface MetricTemplate {
    metricType: MetricType;
    required: boolean;
    defaultValue?: number;
    unit?: string;
}

export class SetMetric {
    public readonly id?: number;
    public readonly exerciseSetId?: number;
    public readonly metricType: MetricType;
    public readonly value: number;
    public readonly unit?: string;

    constructor(data: {
        id?: number;
        exerciseSetId?: number;
        metricType: MetricType;
        value: number;
        unit?: string;
    }) {
        this.id = data.id;
        this.exerciseSetId = data.exerciseSetId;
        this.metricType = data.metricType;
        this.value = data.value;
        this.unit = data.unit;
    }
}

export class ExerciseSet {
    public readonly id?: number;
    public readonly workoutExerciseId?: number;
    public readonly setNumber: number;
    public readonly setType: string;
    public readonly metrics: SetMetric[];

    constructor(data: {
        id?: number;
        workoutExerciseId?: number;
        setNumber: number;
        setType?: string;
        metrics?: SetMetric[];
    }) {
        this.id = data.id;
        this.workoutExerciseId = data.workoutExerciseId;
        this.setNumber = data.setNumber;
        this.setType = data.setType || 'normal';
        this.metrics = data.metrics || [];
    }
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
  public readonly restSeconds: number;
  public readonly orderIndex: number;
  public readonly metricTemplates?: MetricTemplate[];
  public readonly exerciseSets?: ExerciseSet[];

  constructor(data: {
    exercise: Exercise;
    sets: number;
    restSeconds: number;
    orderIndex: number;
    metricTemplates?: MetricTemplate[];
    exerciseSets?: ExerciseSet[];
  }) {
    this.exercise = data.exercise;
    this.sets = data.sets;
    this.restSeconds = data.restSeconds;
    this.orderIndex = data.orderIndex;
    this.metricTemplates = data.metricTemplates;
    this.exerciseSets = data.exerciseSets;
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
  public readonly userWorkoutId?: number;
  public readonly previousWeight: number;
  public readonly newWeight: number;
  public readonly previousReps: number;
  public readonly newReps: number;
  public readonly adaptationType: AdaptationType;
  public readonly reason: string;
  public readonly suggestedExerciseId?: number;

  constructor(data: {
    id?: number;
    userId: number;
    exerciseId: number;
    userWorkoutId?: number;
    previousWeight: number;
    newWeight: number;
    previousReps: number;
    newReps: number;
    adaptationType: AdaptationType;
    reason: string;
    suggestedExerciseId?: number;
  }) {
    this.id = data.id;
    this.userId = data.userId;
    this.exerciseId = data.exerciseId;
    this.userWorkoutId = data.userWorkoutId;
    this.previousWeight = data.previousWeight;
    this.newWeight = data.newWeight;
    this.previousReps = data.previousReps;
    this.newReps = data.newReps;
    this.adaptationType = data.adaptationType;
    this.reason = data.reason;
    this.suggestedExerciseId = data.suggestedExerciseId;
  }
}