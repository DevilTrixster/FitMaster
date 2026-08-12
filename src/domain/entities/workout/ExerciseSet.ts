import { SetMetric } from './SetMetric';

export class ExerciseSet {
    public readonly id?: number;
    public readonly userWorkoutExerciseId?: number;
    public readonly setNumber: number;
    public readonly setType: string;
    public readonly metrics: SetMetric[];

    constructor(data: {
        id?: number;
        userWorkoutExerciseId?: number;
        setNumber: number;
        setType?: string;
        metrics?: SetMetric[];
    }) {
        this.id = data.id;
        this.userWorkoutExerciseId = data.userWorkoutExerciseId;
        this.setNumber = data.setNumber;
        this.setType = data.setType || 'normal';
        this.metrics = data.metrics || [];
    }
}