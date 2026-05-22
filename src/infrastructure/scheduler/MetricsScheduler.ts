import cron from 'node-cron';
import { FatigueRecoveryService } from '../../application/services/adaptation/FatigueRecoveryService';
import { UserRepository } from '../repositories/UserRepository';

export class MetricsScheduler {
  constructor(
    private fatigueService: FatigueRecoveryService,
    private userRepo: UserRepository
  ) {}

  start() {
    // Каждый день в 00:00
    cron.schedule('0 0 * * *', async () => {
      console.log('🔄 Запуск ежедневного обновления метрик утомления...');
      try {
        const users = await this.userRepo.getAllUserIds();
        for (const userId of users) {
          await this.fatigueService.saveDailyMetrics(userId);
        }
        console.log(`✅ Метрики обновлены для ${users.length} пользователей`);
      } catch (error) {
        console.error('❌ Ошибка при обновлении метрик:', error);
      }
    });
  }
}