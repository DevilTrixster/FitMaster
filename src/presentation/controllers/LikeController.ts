import { Request, Response, NextFunction } from 'express';
import { ExerciseLikeService } from '../../application/services/exercise/ExerciseLikeService';
import { ValidationError } from '../../core/errors/ValidationError';

export class LikeController {
  constructor(private likeService: ExerciseLikeService) {}

  async setLike(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const exerciseId = parseInt(req.params.exerciseId as string);
    const { liked } = req.body;

    if (isNaN(exerciseId)) throw new ValidationError('Invalid exerciseId');
    if (typeof liked !== 'boolean') throw new ValidationError('liked must be boolean');

    await this.likeService.setLike(userId, exerciseId, liked);
    res.status(200).json({ message: 'Like updated' });
  }

  async getUserLikes(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = (req as any).userId;
    const likes = await this.likeService.getUserLikes(userId);
    const result: Record<number, boolean> = {};
    likes.forEach((v, k) => { result[k] = v; });
    res.json(result);
  }
}