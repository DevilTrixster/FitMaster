// src/domain/entities/User.ts

// Перечисление для пола (строгая типизация)
export enum Gender {
  Male = 'male',
  Female = 'female',
  Other = 'other',
}

export class User {
  public readonly id?: number;
  public readonly nickname: string;
  public readonly password: string; // В реальности здесь должен быть хеш
  public readonly email: string;
  public readonly firstName: string;
  public readonly lastName: string;
  public readonly birthDate: Date;
  public readonly gender: Gender;
  public readonly height: number; // в см
  public readonly weight: number; // в кг
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
    this.createdAt = data.createdAt || new Date();
  }

  // Метод для получения полного имени (пример бизнес-логики внутри сущности)
  public getFullName(): string {
    return `${this.lastName} ${this.firstName}`;
  }

  // Метод для расчета ИМТ (пример бизнес-логики)
  public getBMI(): number {
    const heightInMeters = this.height / 100;
    return Number((this.weight / (heightInMeters * heightInMeters)).toFixed(2));
  }
}