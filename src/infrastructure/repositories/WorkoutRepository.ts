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
  async getWorkoutById(id: number): Promise<Workout | null> { return this.readRepo.getWorkoutById(id); }
  async getBaseWorkout(): Promise<Workout | null> { return null; }
  async createUserWorkout(userWorkout: UserWorkout): Promise<UserWorkout> { return this.writeRepo.createUserWorkout(userWorkout); }
  async getUserWorkouts(userId: number, limit?: number): Promise<UserWorkout[]> { return this.readRepo.getUserWorkouts(userId, limit); }
  async getUserWorkoutById(id: number): Promise<UserWorkout | null> { return this.readRepo.getUserWorkoutById(id); }
  async updateUserWorkoutStatus(id: number, status: string, wellnessRating?: number, comments?: string): Promise<void> { return this.writeRepo.updateUserWorkoutStatus(id, status, wellnessRating, comments); }
  async startUserWorkout(id: number): Promise<void> { return this.writeRepo.startUserWorkout(id); }
  async pauseUserWorkout(id: number, lastExerciseIndex: number): Promise<void> { return this.writeRepo.pauseUserWorkout(id, lastExerciseIndex); }
  async resumeUserWorkout(id: number): Promise<void> { return this.writeRepo.resumeUserWorkout(id); }
  async getUserActiveWorkout(userId: number): Promise<UserWorkout | null> { return this.readRepo.getUserActiveWorkout(userId); }
  async getAllExercises(): Promise<Exercise[]> { return this.exerciseRepo.getAllExercises(); }
  async rescheduleWorkout(id: number, newDate: Date, reason?: string): Promise<void> { return this.writeRepo.rescheduleWorkout(id, newDate, reason); }
  async skipWorkout(id: number, reason?: string): Promise<void> { return this.writeRepo.skipWorkout(id, reason); }
  async saveAdaptation(adaptation: WorkoutAdaptation): Promise<void> { return this.adaptationRepo.saveAdaptation(adaptation); }
  async getUserAdaptations(userId: number, exerciseId: number, limit?: number): Promise<WorkoutAdaptation[]> { return this.adaptationRepo.getUserAdaptations(userId, exerciseId, limit); }
  async getLatestAdaptation(userId: number, exerciseId: number): Promise<WorkoutAdaptation | null> { return this.adaptationRepo.getLatestAdaptation(userId, exerciseId); }
  async getWorkoutHistory(userId: number, limit: number, offset: number, status?: string, dateFrom?: string, dateTo?: string): Promise<UserWorkout[]> { return this.readRepo.getWorkoutHistory(userId, limit, offset, status, dateFrom, dateTo); }
  async getSplitPrograms(): Promise<Workout[]> { return this.readRepo.getSplitPrograms(); }
  async saveExerciseSubstitution(userId: number, originalExerciseId: number, alternativeExerciseId: number, reason: string): Promise<void> { return this.adaptationRepo.saveExerciseSubstitution(userId, originalExerciseId, alternativeExerciseId, reason); }
  async getUserExerciseSubstitutions(userId: number): Promise<Array<{ originalExerciseId: number; alternativeExerciseId: number; reason: string; suggestedAt: Date }>> { return this.adaptationRepo.getUserExerciseSubstitutions(userId);}
  async getExerciseById(id: number): Promise<Exercise | null> { return this.exerciseRepo.getExerciseById(id); }
  async getExerciseMetricTemplates(exerciseId: number): Promise<MetricTemplate[]> { return this.exerciseRepo.getExerciseMetricTemplates(exerciseId); }
  async saveExerciseSet(workoutExerciseId: number, exerciseSet: ExerciseSet): Promise<ExerciseSet> { return this.exerciseRepo.saveExerciseSet(workoutExerciseId, exerciseSet); }
  async getExerciseSets(workoutExerciseId: number): Promise<ExerciseSet[]> { return this.exerciseRepo.getExerciseSets(workoutExerciseId); }
  async getWorkoutExerciseId(userWorkoutId: number, exerciseId: number): Promise<number | null> { return this.exerciseRepo.getWorkoutExerciseId(userWorkoutId, exerciseId); }
  async updateFutureWorkoutsTime(userId: number, newTime: string): Promise<void> { return this.writeRepo.updateFutureWorkoutsTime(userId, newTime); }
  async getDailyWorkoutVolumes(userId: number, days: number): Promise<Array<{ date: string; volume: number }>> { return this.readRepo.getDailyWorkoutVolumes(userId, days);}
  async getAllUserAdaptations(userId: number, limit?: number): Promise<WorkoutAdaptation[]> { return this.adaptationRepo.getAllUserAdaptations(userId, limit); }
}