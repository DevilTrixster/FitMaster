import { Request, Response } from 'express';
import { WorkoutService } from '../../application/services/WorkoutService';

export class SubstitutionController {
  constructor(private workoutService: WorkoutService) {}

  async getSubstitutions(req: Request, res: Response) {
    try {
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
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async acceptSubstitution(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { originalExerciseId, alternativeExerciseId } = req.body;
      
      // Здесь можно добавить логику автоматической замены упражнения в следующей тренировке
      console.log(`✅ Пользователь ${userId} принял замену: ${originalExerciseId} -> ${alternativeExerciseId}`);
      
      res.json({ message: 'Замена принята' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}