import { 
  Workout, 
  UserWorkout, 
  Exercise, 
  WorkoutExercise, 
  WorkoutStatus, 
  WorkoutAdaptation, 
  AdaptationType,
  MetricTemplate,
  MetricType,
  ExerciseSet,
  SetMetric
} from '../../domain/entities/Workout';
import { Pool } from 'pg';
import { IWorkoutRepository } from '../../domain/interfaces/IWorkoutRepository';
import { WorkoutReadRepository } from './WorkoutService/WorkoutReadRepository';
import { WorkoutWriteRepository } from './WorkoutService/WorkoutWriteRepository';
import { ExerciseRepository } from './WorkoutService/ExerciseRepository';
import { AdaptationRepository } from './WorkoutService/AdaptationRepository';

export class WorkoutRepository implements IWorkoutRepository {
  private readRepo: WorkoutReadRepository;
  private writeRepo: WorkoutWriteRepository;
  private exerciseRepo: ExerciseRepository;
  private adaptationRepo: AdaptationRepository;

  constructor(private pool: Pool) {
    this.readRepo = new WorkoutReadRepository(pool);
    this.writeRepo = new WorkoutWriteRepository(pool);
    this.exerciseRepo = new ExerciseRepository(pool);
    this.adaptationRepo = new AdaptationRepository(pool);
  }

  // Делегирование всем методам
  async getWorkoutById(id: number) { return this.readRepo.getWorkoutById(id); }
  async getBaseWorkout() { /* можно использовать чтение */ return null; }
  async createUserWorkout(userWorkout: UserWorkout) { return this.writeRepo.createUserWorkout(userWorkout); }
  async getUserWorkouts(userId: number, limit?: number) { return this.readRepo.getUserWorkouts(userId, limit); }
  async getUserWorkoutById(id: number) { return this.readRepo.getUserWorkoutById(id); }
  async updateUserWorkoutStatus(id: number, status: string, wellnessRating?: number, comments?: string) {
    return this.writeRepo.updateUserWorkoutStatus(id, status, wellnessRating, comments);
  }
  async startUserWorkout(id: number) { return this.writeRepo.startUserWorkout(id); }
  async pauseUserWorkout(id: number, lastExerciseIndex: number) { return this.writeRepo.pauseUserWorkout(id, lastExerciseIndex); }
  async resumeUserWorkout(id: number) { return this.writeRepo.resumeUserWorkout(id); }
  async getUserActiveWorkout(userId: number): Promise<UserWorkout | null> {
  return this.readRepo.getUserActiveWorkout(userId);
}
  async getAllExercises() { return this.exerciseRepo.getAllExercises(); }
  async rescheduleWorkout(id: number, newDate: Date, reason?: string) { return this.writeRepo.rescheduleWorkout(id, newDate, reason); }
  async skipWorkout(id: number, reason?: string) { return this.writeRepo.skipWorkout(id, reason); }
  async saveAdaptation(adaptation: WorkoutAdaptation) { return this.adaptationRepo.saveAdaptation(adaptation); }
  async getUserAdaptations(userId: number, exerciseId: number, limit?: number) { return this.adaptationRepo.getUserAdaptations(userId, exerciseId, limit); }
  async getWorkoutHistory(userId: number, limit: number, offset: number, status?: string, dateFrom?: string, dateTo?: string) {
    return this.readRepo.getWorkoutHistory(userId, limit, offset, status, dateFrom, dateTo);
  }
  async getSplitPrograms() { return this.readRepo.getSplitPrograms(); }
  async saveExerciseSubstitution(userId: number, originalExerciseId: number, alternativeExerciseId: number, reason: string) {
    return this.adaptationRepo.saveExerciseSubstitution(userId, originalExerciseId, alternativeExerciseId, reason);
  }
  async getUserExerciseSubstitutions(userId: number) { return this.adaptationRepo.getUserExerciseSubstitutions(userId); }
  async getExerciseById(id: number) { return this.exerciseRepo.getExerciseById(id); }
  async getExerciseMetricTemplates(exerciseId: number) { return this.exerciseRepo.getExerciseMetricTemplates(exerciseId); }
  async saveExerciseSet(workoutExerciseId: number, exerciseSet: ExerciseSet) { return this.exerciseRepo.saveExerciseSet(workoutExerciseId, exerciseSet); }
  async getExerciseSets(workoutExerciseId: number) { return this.exerciseRepo.getExerciseSets(workoutExerciseId); }
  async getWorkoutExerciseId(userWorkoutId: number, exerciseId: number) { return this.exerciseRepo.getWorkoutExerciseId(userWorkoutId, exerciseId); }
  async updateFutureWorkoutsTime(userId: number, newTime: string) { return this.writeRepo.updateFutureWorkoutsTime(userId, newTime); }
}