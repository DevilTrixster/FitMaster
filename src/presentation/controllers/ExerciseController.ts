import { Request, Response, NextFunction } from 'express';
import { WorkoutFacade } from '../../application/services/workout/WorkoutFacade';

// Контроллер упражнений
export class ExerciseController {
    constructor(
        private workoutFacade: WorkoutFacade
      ) {}

    async getExercises(req: Request, res: Response, next: NextFunction): Promise<void> {
        const exercises = await this.workoutFacade.getAllExercises();
        res.json(
            exercises.map(ex => ({
            id: ex.id,
            name: ex.name,
            muscleGroup: ex.muscleGroup,
            }))
        );
    }
}