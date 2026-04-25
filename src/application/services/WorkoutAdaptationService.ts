import { IWorkoutRepository } from '../../domain/interfaces/IWorkoutRepository';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { WorkoutAdaptation, AdaptationType, SetResult, WorkoutExercise } from '../../domain/entities/Workout';
import { getAlternativeExercises } from '../../domain/utils/ExerciseAlternatives';

export class WorkoutAdaptationService {
  constructor(
    private workoutRepo: IWorkoutRepository,
    private userRepo: IUserRepository
  ) {}

  // Главный метод: адаптация на основе результатов и самочувствия
  async adaptExercise(
    userId: number,
    completedWorkoutId: number,
    exercise: WorkoutExercise,
    wellnessRating: number,
    results: SetResult[]
  ): Promise<WorkoutAdaptation | null> {
    if (!exercise.exercise.id) {
        console.warn(`Упражнение "${exercise.exercise.name}" не имеет ID`);
        return null;
    }
    if (results.length === 0) return null;

    // 1. Анализ выполнения
    const allSuccessful = results.every(r => r.isSuccessful());
    const anyFailed = results.some(r => r.needsRegression());
    
    // 2. История адаптаций для этого упражнения (последние 5)
    const lastAdaptations = await this.workoutRepo.getUserAdaptations(userId, exercise.exercise.id, 5);
    
    // 3. Проверка на "плато" (слишком частые увеличения)
    const consecutiveIncreases = lastAdaptations.filter(a => a.adaptationType === AdaptationType.IncreaseWeight).length;
    
    // 4. Логика принятия решения
    let adaptationType: AdaptationType | null = null;
    let newWeight = exercise.targetWeight || 0;
    let newRepsMin = exercise.repMin;
    let newRepsMax = exercise.repMax;
    let reason = '';

    // Сценарий А: Плохое самочувствие -> Снижаем нагрузку
    if (wellnessRating <= 2) {
      newWeight = Math.round(newWeight * 0.85); // Снижаем на 15%
      adaptationType = AdaptationType.DecreaseWeight;
      reason = `Низкое самочувствие (${wellnessRating}/5). Автоматическая разгрузка.`;
    }
    // Сценарий Б: Неудача -> Регрессия
    else if (anyFailed) {
      newWeight = Math.round(newWeight * 0.9); // Снижаем на 10%
      adaptationType = AdaptationType.DecreaseWeight;
      reason = 'Невыполнение повторений. Снижение веса.';
    }
    // Сценарий В: Успех -> Прогрессия
    else if (allSuccessful) {
      // Если было уже 3 увеличения подряд, предлагаем не вес, а повторения (периодизация)
      if (consecutiveIncreases >= 3) {
        newRepsMin = exercise.repMin + 1;
        newRepsMax = exercise.repMax + 1;
        adaptationType = AdaptationType.IncreaseReps;
        reason = 'Стабилизация веса. Увеличение повторений (периодизация).';
      } else {
        // Линейная прогрессия + небольшой бонус
        const increasePercent = 0.025 + (Math.random() * 0.025); // 2.5% - 5%
        newWeight = Math.round(newWeight * (1 + increasePercent));
        adaptationType = AdaptationType.IncreaseWeight;
        reason = `Успешное выполнение. Прогрессия нагрузки (+${Math.round(increasePercent * 100)}%).`;
      }
    }

    // Если изменений нет, возвращаем null
    if (!adaptationType) return null;

    // Создаем запись об адаптации
    const adaptation = new WorkoutAdaptation({
      userId,
      exerciseId: exercise.exercise.id!,
      previousWeight: exercise.targetWeight || newWeight,
      newWeight,
      previousReps: exercise.repMin,
      newReps: newRepsMin,
      adaptationType,
      reason,
    });

  // ПРОВЕРКА НА ЗАСТОЙ (после сохранения адаптации)
  if (anyFailed && lastAdaptations.length >= 3) {
    const consecutiveFailures = lastAdaptations.filter(
      a => a.adaptationType === AdaptationType.DecreaseWeight
    ).length;
    
    if (consecutiveFailures >= 3) {
      // Предлагаем альтернативу
      const alternatives = getAlternativeExercises(exercise.exercise.id!);
      
      if (alternatives.length > 0) {
        const bestAlternative = alternatives[0];
        
        await this.workoutRepo.saveExerciseSubstitution(
          userId,
          exercise.exercise.id!,
          bestAlternative.alternativeExerciseId,
          bestAlternative.reason
        );
        
        console.log(`💡 Предложена замена упражнения ${exercise.exercise.name} -> ${bestAlternative.reason}`);
      }
    }
  }
    await this.workoutRepo.saveAdaptation(adaptation);
    return adaptation;
  }
}