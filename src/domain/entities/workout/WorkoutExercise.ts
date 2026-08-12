import { Exercise } from './Exercise';
import { IMetricTemplate } from '../../interfaces/IMetricTemplate';
import { ExerciseSet } from './ExerciseSet';

export class WorkoutExercise {
  public readonly exercise: Exercise;
  public readonly sets: number;
  public readonly restSeconds: number;
  public readonly orderIndex: number;
  public readonly metricTemplates?: IMetricTemplate[];
  public readonly exerciseSets?: ExerciseSet[];

  constructor(data: {
    exercise: Exercise;
    sets: number;
    restSeconds: number;
    orderIndex: number;
    metricTemplates?: IMetricTemplate[];
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