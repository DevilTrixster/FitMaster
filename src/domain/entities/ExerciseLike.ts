// Лайки
export class ExerciseLike {
  constructor(
    public readonly userId: number,
    public readonly exerciseId: number,
    public readonly liked: boolean,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}
}