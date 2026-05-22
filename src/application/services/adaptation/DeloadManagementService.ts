import { IDeloadRepository } from '../../../domain/interfaces/IDeloadRepository';
import { FatigueRecoveryService } from './FatigueRecoveryService';

export class DeloadManagementService {
  constructor(
    private deloadRepo: IDeloadRepository,
    private fatigueService: FatigueRecoveryService
  ) {}

  async checkAndStartDeload(userId: number): Promise<boolean> {
    const should = await this.fatigueService.shouldDeload(userId);
    if (should) {
      const active = await this.deloadRepo.getActiveDeload(userId);
      if (!active) {
        await this.deloadRepo.startDeload(userId, 'High fatigue or low recovery', 0.6);
        return true;
      }
    }
    return false;
  }
}