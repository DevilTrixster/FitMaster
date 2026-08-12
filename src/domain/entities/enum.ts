export enum WorkoutStatus {
  Scheduled = 'scheduled', // планируется
  InProgress = 'in_progress', // в прогрессе
  Completed = 'completed', // завершенно
  Skipped = 'skipped', // пропущенно
  Rescheduled = 'rescheduled', // перенесенно
}

export enum MetricType {
  Reps = 'reps', // повторение
  Weight = 'weight', // вес
  Duration = 'duration', // продолжительность (время ММ:СС)
  Distance = 'distance', // расстаяние
  Calories = 'calories', // каллории 
  Incline = 'incline', // --
  Resistance = 'resistance', // восстановление
}

export enum AdaptationType {
  IncreaseWeight = 'increase_weight', // увеличение веса
  DecreaseWeight = 'decrease_weight', // уменьшение веса
  IncreaseReps = 'increase_reps', // увеличение повторения
  DecreaseReps = 'decrease_reps', // уменьшение повторений
  NoChange = 'no_change', // без изменений 
  Substitution = 'substitution', // замена
}

export enum Gender { 
  Male = 'male', 
  Female = 'female' 
}

export enum ExperienceLevel {
  Beginner = 'beginner',   // 0–3 мес
  Novice = 'novice',       // 3–12 мес
  Intermediate = 'intermediate', // 1–3 года
  Advanced = 'advanced',   // 3–5 лет
  Master = 'master'        // 5–8 лет
}

export enum FitnessGoal {
  WeightLoss = 'weight_loss',         // Похудение
  MuscleGain = 'muscle_gain',         // Наращивание мышц
  Strength = 'strength',              // Сила
  Maintenance = 'maintenance',        // Поддержка
  Endurance = 'endurance',            // Выносливость
  Aesthetics = 'aesthetics',          // Эстетичность тела
  Recomposition = 'recomposition',    // Перекомпановка - изменчивость упражнений
  Mobility = 'mobility',              // Мобильность/Подвижность
  Rehabilitation = 'rehabilitation',  // Реабилитация - после травм
  Sports = 'sports',                  // Для конкретного спорта
  Event = 'event',                    // Для события
  StressRelief = 'stress_relief',     // Снятия стресса
  Energy = 'energy',                  // Энергия
  Competition = 'competition',        // Соревнования
  Posture = 'posture',                // Со своим телом
  HealthyAging = 'healthy_aging'      // Поддержание здоровья
}