import { Gender, ExperienceLevel, FitnessGoal } from './enum'

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