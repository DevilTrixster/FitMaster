import { Request, Response, NextFunction } from 'express';
import { WorkoutService } from '../../application/services/WorkoutService';

export class SubstitutionController {
  constructor(private workoutService: WorkoutService) {}

  async getSubstitutions(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const substitutions = await this.workoutService.getExerciseSubstitutions(userId);

    res.json({
      substitutions: substitutions.map(s => ({
        originalExercise: {
          id: s.originalExercise.id,
          name: s.originalExercise.name,
          muscleGroup: s.originalExercise.muscleGroup,
        },
        alternativeExercise: {
          id: s.alternativeExercise.id,
          name: s.alternativeExercise.name,
          muscleGroup: s.alternativeExercise.muscleGroup,
        },
        reason: s.reason,
        suggestedAt: s.suggestedAt,
      })),
    });
  }

  async acceptSubstitution(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const { originalExerciseId, alternativeExerciseId } = req.body;

    console.log(
      `✅ Пользователь ${userId} принял замену: ${originalExerciseId} -> ${alternativeExerciseId}`
    );

    res.json({ message: 'Замена принята' });
  }
}