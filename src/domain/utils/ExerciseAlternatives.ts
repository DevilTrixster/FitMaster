export interface ExerciseAlternative {
  primaryExerciseId: number;
  alternativeExerciseId: number;
  reason: string;
  priority: number; // 1 = лучшая замена, 2 = хорошая, 3 = допустимая
}

export const EXERCISE_ALTERNATIVES: ExerciseAlternative[] = [
  // Грудь
  { primaryExerciseId: 2, alternativeExerciseId: 12, reason: 'Жим гантелей вместо штанги', priority: 1 }, // Жим лёжа -> Жим гантелей
  { primaryExerciseId: 2, alternativeExerciseId: 6, reason: 'Отжимания вместо жима', priority: 2 }, // Жим лёжа -> Отжимания
  
  // Спина
  { primaryExerciseId: 5, alternativeExerciseId: 11, reason: 'Тяга верхнего блока', priority: 1 }, // Тяга штанги -> Тяга блока
  { primaryExerciseId: 7, alternativeExerciseId: 11, reason: 'Тяга верхнего блока', priority: 1 }, // Подтягивания -> Тяга блока
  
  // Ноги
  { primaryExerciseId: 1, alternativeExerciseId: 8, reason: 'Выпады вместо приседаний', priority: 1 }, // Приседания -> Выпады
  
  // Плечи
  { primaryExerciseId: 4, alternativeExerciseId: 6, reason: 'Отжимания с упором на плечи', priority: 2 }, // Жим над головой -> Отжимания
  
  // Руки
  { primaryExerciseId: 13, alternativeExerciseId: 7, reason: 'Подтягивания обратным хватом', priority: 2 }, // Подъём на бицепс -> Подтягивания
  { primaryExerciseId: 14, alternativeExerciseId: 6, reason: 'Отжимания узким хватом', priority: 2 }, // Французский жим -> Отжимания
];

export function getAlternativeExercises(exerciseId: number): ExerciseAlternative[] {
  return EXERCISE_ALTERNATIVES
    .filter(alt => alt.primaryExerciseId === exerciseId)
    .sort((a, b) => a.priority - b.priority);
}