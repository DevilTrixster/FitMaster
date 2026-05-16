export enum Gender { Male = 'male', Female = 'female' }

// Добавляем перечисления для уровня и цели
export enum ExperienceLevel {
  Beginner = 'beginner',   // 0–3 мес
  Novice = 'novice',       // 3–12 мес
  Intermediate = 'intermediate', // 1–3 года
  Advanced = 'advanced',   // 3–5 лет
  Master = 'master'        // 5–8 лет
}

export enum FitnessGoal {
  WeightLoss = 'weight_loss',
  MuscleGain = 'muscle_gain',
  Strength = 'strength',
  Maintenance = 'maintenance',
  Endurance = 'endurance',
  Aesthetics = 'aesthetics',
  Recomposition = 'recomposition',
  Mobility = 'mobility',
  Rehabilitation = 'rehabilitation',
  Sports = 'sports',
  Event = 'event',
  StressRelief = 'stress_relief',
  Energy = 'energy',
  Competition = 'competition',
  Posture = 'posture',
  HealthyAging = 'healthy_aging'
}

export class User {
  public readonly id?: number;
  public readonly nickname: string;
  public readonly password: string;
  public readonly email: string;
  public readonly firstName: string;
  public readonly lastName: string;
  public readonly birthDate: Date;
  public readonly gender: Gender;
  public readonly height: number;
  public readonly weight: number;
  public readonly preferredWorkoutTime?: string;
  public readonly experienceLevel: ExperienceLevel;
  public readonly fitnessGoal: FitnessGoal;
  public readonly createdAt: Date;

  constructor(data: {
    nickname: string;
    password: string;
    email: string;
    firstName: string;
    lastName: string;
    birthDate: Date;
    gender: Gender;
    height: number;
    weight: number;
    preferredWorkoutTime?: string;
    experienceLevel?: ExperienceLevel;
    fitnessGoal?: FitnessGoal;
    id?: number;
    createdAt?: Date;
  }) {
    this.id = data.id;
    this.nickname = data.nickname;
    this.password = data.password;
    this.email = data.email;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.birthDate = data.birthDate;
    this.gender = data.gender;
    this.height = data.height;
    this.weight = data.weight;
    this.preferredWorkoutTime = data.preferredWorkoutTime;
    this.experienceLevel = data.experienceLevel || ExperienceLevel.Novice;
    this.fitnessGoal = data.fitnessGoal || FitnessGoal.Maintenance;
    this.createdAt = data.createdAt || new Date();
  }

  public getFullName(): string {
    return `${this.lastName} ${this.firstName}`;
  }

  public getBMI(): number {
    const heightInMeters = this.height / 100;
    return Number((this.weight / (heightInMeters * heightInMeters)).toFixed(2));
  }
}