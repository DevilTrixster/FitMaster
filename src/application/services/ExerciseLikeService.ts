import { IExerciseLikeRepository } from '../../domain/interfaces/IExerciseLikeRepository';

export class ExerciseLikeService {
  constructor(private likeRepo: IExerciseLikeRepository) {}

  async setLike(userId: number, exerciseId: number, liked: boolean): Promise<void> {
    await this.likeRepo.setLike(userId, exerciseId, liked);
  }

  async getUserLikes(userId: number): Promise<Map<number, boolean>> {
    return this.likeRepo.getLikes(userId);
  }
}