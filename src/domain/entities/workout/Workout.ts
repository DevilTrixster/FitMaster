import { WorkoutExercise } from './WorkoutExercise';

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
