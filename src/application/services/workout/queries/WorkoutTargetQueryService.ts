import { IDeloadRepository } from "../../../../domain/interfaces/IDeloadRepository";
import { WorkoutQueryService } from "./WorkoutQueryService";


export class WorkoutTargetQueryService {
    constructor(
        private readonly workoutQueryService: WorkoutQueryService,
        private readonly deloadRepository: IDeloadRepository
    ) {}

    async getExerciseTargets(
        userId: number,
        exerciseId: number
    ): Promise<{
        targetWeight: number | null;
        targetReps: number | null;
        isDeload: boolean;
    }> {
        const latestAdaptation =
            await this.workoutQueryService.getLatestAdaptation(
                userId,
                exerciseId
            );

        const activeDeload =
            await this.deloadRepository.getActiveDeload(userId);

        if (!latestAdaptation) {
            return {
                targetWeight: null,
                targetReps: null,
                isDeload: false
            };
        }

        let targetWeight = latestAdaptation.newWeight;
        let targetReps = latestAdaptation.newReps;

        if (activeDeload) {
            targetWeight *= activeDeload.intensityFactor;
        }

        return {
            targetWeight,
            targetReps,
            isDeload: Boolean(activeDeload)
        };
    }
}