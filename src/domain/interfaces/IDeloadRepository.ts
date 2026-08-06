// Интерфейс разгрузки
export interface IDeloadPeriod {
  id?: number;
  userId: number;
  startDate: Date;
  endDate?: Date;
  intensityFactor: number;
  reason?: string;
}

// Репозиторий разгрузки
export interface IDeloadRepository {
  getActiveDeload(userId: number): Promise<IDeloadPeriod | null>;
  startDeload(userId: number, reason: string, intensityFactor?: number): Promise<void>;
  endDeload(userId: number): Promise<void>;
}