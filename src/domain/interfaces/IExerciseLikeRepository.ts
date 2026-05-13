export interface IExerciseLikeRepository {
  setLike(userId: number, exerciseId: number, liked: boolean): Promise<void>;
  getLikes(userId: number, exerciseIds?: number[]): Promise<Map<number, boolean>>;
}