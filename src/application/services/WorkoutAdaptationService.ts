import { IWorkoutRepository } from '../../domain/interfaces/IWorkoutRepository';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { 
  WorkoutAdaptation, 
  AdaptationType, 
  SetResult, 
  WorkoutExercise 
} from '../../domain/entities/Workout';
import { getAlternativeExercises } from '../../domain/utils/ExerciseAlternatives';

export class WorkoutAdaptationService {
  constructor(
    private workoutRepo: IWorkoutRepository,
    private userRepo: IUserRepository
  ) {}

  /**
   * Главный метод: адаптация на основе результатов и самочувствия
   * Учитывает:
   * - Выполненные подходы
   * - Пропущенные подходы
   * - Самочувствие
   * - Историю адаптаций
   */
  async adaptExercise(
    userId: number,
    completedWorkoutId: number,
    exercise: WorkoutExercise,
    wellnessRating: number,
    results: SetResult[]
  ): Promise<WorkoutAdaptation | null> {
    // Проверка наличия ID упражнения
    if (!exercise.exercise.id) {
      console.warn(`Упражнение "${exercise.exercise.name}" не имеет ID`);
      return null;
    }

    if (results.length === 0) {
      console.log('⚠️ Нет результатов для адаптации');
      return null;
    }

    // 1. Анализ выполнения
    const completedResults = results.filter(r => r.completed && !r.skipped);
    const skippedResults = results.filter(r => r.skipped);
    const failedResults = results.filter(r => !r.completed && !r.skipped && r.needsRegression());
    
    const allSuccessful = completedResults.length > 0 && 
                          completedResults.every(r => r.isSuccessful());
    const anyFailed = failedResults.length > 0;
    const skippedCount = skippedResults.length;
    const totalSets = results.length;

    console.log(`📊 Анализ упражнения:`, {
      total: totalSets,
      completed: completedResults.length,
      skipped: skippedCount,
      failed: failedResults.length,
      allSuccessful
    });

    // 2. История адаптаций для этого упражнения (последние 5)
    const lastAdaptations = await this.workoutRepo.getUserAdaptations(
      userId, 
      exercise.exercise.id, 
      5
    );

    // 3. Проверка на "плато" (слишком частые увеличения)
    const consecutiveIncreases = lastAdaptations.filter(
      a => a.adaptationType === AdaptationType.IncreaseWeight
    ).length;

    // 4. Логика принятия решения
    let adaptationType: AdaptationType | null = null;
    let newWeight = exercise.targetWeight || 0;
    let newRepsMin = exercise.repMin;
    let newRepsMax = exercise.repMax;
    let reason = '';

    // Сценарий A: Пропущено больше 50% подходов → серьёзное снижение
    if (skippedCount > totalSets / 2) {
      newWeight = Math.round(newWeight * 0.85); // Снижаем на 15%
      adaptationType = AdaptationType.DecreaseWeight;
      reason = `Пропущено ${skippedCount} из ${totalSets} подходов. Значительное снижение нагрузки.`;
      
      console.log(`⚠️ ${reason}`);
    }
    // Сценарий B: Плохое самочувствие → снижение нагрузки
    else if (wellnessRating <= 2) {
      newWeight = Math.round(newWeight * 0.9); // Снижаем на 10%
      adaptationType = AdaptationType.DecreaseWeight;
      reason = `Низкое самочувствие (${wellnessRating}/5). Автоматическая разгрузка.`;
      
      console.log(`😔 ${reason}`);
    }
    // Сценарий C: Есть неудачи → регрессия
    else if (anyFailed) {
      newWeight = Math.round(newWeight * 0.9); // Снижаем на 10%
      adaptationType = AdaptationType.DecreaseWeight;
      reason = 'Невыполнение повторений. Снижение веса.';
      
      console.log(`❌ ${reason}`);
    }
    // Сценарий D: Успех → прогрессия
    else if (allSuccessful) {
      // Если было уже 3 увеличения подряд, предлагаем не вес, а повторения (периодизация)
      if (consecutiveIncreases >= 3) {
        newRepsMin = exercise.repMin + 1;
        newRepsMax = exercise.repMax + 1;
        adaptationType = AdaptationType.IncreaseReps;
        reason = 'Стабилизация веса. Увеличение повторений (периодизация).';
        
        console.log(`📈 ${reason}`);
      } else {
        // Линейная прогрессия + небольшой бонус (2.5% - 5%)
        const increasePercent = 0.025 + (Math.random() * 0.025);
        newWeight = Math.round(newWeight * (1 + increasePercent));
        adaptationType = AdaptationType.IncreaseWeight;
        reason = `Успешное выполнение. Прогрессия нагрузки (+${Math.round(increasePercent * 100)}%).`;
        
        console.log(`💪 ${reason}`);
      }
    }

    // Если изменений нет, возвращаем null
    if (!adaptationType) {
      console.log('➡️ Адаптация не требуется');
      return null;
    }

    // 5. Создаем запись об адаптации
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

    // 6. ПРОВЕРКА НА ЗАСТОЙ (предложение альтернативы)
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
          
          console.log(`💡 Предложена замена упражнения "${exercise.exercise.name}" → ${bestAlternative.reason}`);
        }
      }
    }

    // 7. Сохраняем адаптацию
    await this.workoutRepo.saveAdaptation(adaptation);
    
    console.log(`✅ Адаптация сохранена: ${exercise.exercise.name}`);
    
    return adaptation;
  }
}