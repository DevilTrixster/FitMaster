import { MetricType, ExerciseSet, SetMetric } from '../../../../domain/entities';
import { FitnessGoal } from '../../../../domain/entities';
import { IWorkoutRepository } from '../../../../domain/interfaces/IWorkoutRepository';
import { IUserRepository } from '../../../../domain/interfaces/IUserRepository';
import { IntelligentAdaptationService } from '../../adaptation/IntelligentAdaptationService';
import { FatigueRecoveryService } from '../../adaptation/FatigueRecoveryService';
import { DeloadManagementService } from '../../adaptation/DeloadManagementService';
import { UnauthorizedError, ValidationError } from '../../../../core/errors/ValidationError';
import { SetAnalysisData } from '../../../dto/SetAnalysisData';

export class WorkoutResultsService {
  constructor(
    private workoutRepository: IWorkoutRepository,
    private userRepository: IUserRepository,
    private adaptationService: IntelligentAdaptationService,
    private fatigueService: FatigueRecoveryService,
    private deloadManagementService: DeloadManagementService   // добавить
  ) {}

  async saveSetMetrics(
    workoutId: number,
    userId: number,
    exerciseId: number,
    setNumber: number,
    setType: string,
    metrics: { metricType: MetricType; value: number; unit?: string }[]
  ): Promise<void> {
    const userWorkout = await this.workoutRepository.getUserWorkoutById(workoutId);
    if (!userWorkout || userWorkout.userId !== userId) {
      throw new UnauthorizedError('Доступ запрещён');
    }

    const userWorkoutExerciseId = await this.workoutRepository.getUserWorkoutExerciseId(
      workoutId,
      exerciseId
    );
    if (userWorkoutExerciseId === null) {
      throw new ValidationError('Упражнение не найдено в тренировке');
    }

    const exerciseSet = new ExerciseSet({
      setNumber,
      setType,
      metrics: metrics.map(
        (m) => new SetMetric({ metricType: m.metricType, value: m.value, unit: m.unit })
      ),
    });

    await this.workoutRepository.saveExerciseSet(userWorkoutExerciseId, exerciseSet);
  }

  async triggerAdaptation(
    userId: number,
    completedWorkoutId: number,
    wellnessRating: number
  ): Promise<void> {
    const userWorkout = await this.workoutRepository.getUserWorkoutById(completedWorkoutId);
    if (!userWorkout) return;

    const user = await this.userRepository.findById(userId);
    const fitnessGoal = user?.fitnessGoal || FitnessGoal.Maintenance;

    for (const exercise of userWorkout.workout.exercises) {
      if (!exercise.exercise.id) continue;

      const userWorkoutExerciseId = await this.workoutRepository.getUserWorkoutExerciseId(
        completedWorkoutId,
        exercise.exercise.id
      );
      if (!userWorkoutExerciseId) continue;

      const exerciseSets = await this.workoutRepository.getExerciseSets(userWorkoutExerciseId);
      const templates = await this.workoutRepository.getExerciseMetricTemplates(
        exercise.exercise.id
      );

      const targetReps = templates.find((t) => t.metricType === MetricType.Reps)?.defaultValue;
      const targetWeight = templates.find((t) => t.metricType === MetricType.Weight)?.defaultValue;

      const analysisData: SetAnalysisData[] = exerciseSets.map((set) => {
        const reps = set.metrics.find((m) => m.metricType === MetricType.Reps)?.value;
        const weight = set.metrics.find((m) => m.metricType === MetricType.Weight)?.value;
        return { completed: true, skipped: false, reps, weight, targetReps, targetWeight };
      });

      await this.adaptationService.adaptExercise(
        userId,
        completedWorkoutId,
        exercise.exercise.id!,
        exercise.exercise.muscleGroup,
        analysisData,
        wellnessRating,
        fitnessGoal
      );
    }

    await this.fatigueService.saveDailyMetrics(userId);

    // Проверка на необходимость разгрузочной недели
    const deloadStarted = await this.deloadManagementService.checkAndStartDeload(userId);
    if (deloadStarted) {
      console.log(`Разгрузочная неделя начата для пользователя ${userId}`);
    }
  }

  calculateRecommendedWeight(userWeight: number, muscleGroup: string): number {
    const percentages: Record<string, number> = {
      chest: 0.5, back: 0.6, legs: 0.75, shoulders: 0.3, core: 0, arms: 0.4,
    };
    const base = percentages[muscleGroup] ?? 0.5;
    return Math.round(userWeight * base);
  }
}