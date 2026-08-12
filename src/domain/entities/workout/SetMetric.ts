import { MetricType } from '../enum';

export class SetMetric {
    public readonly id?: number;
    public readonly exerciseSetId?: number;
    public readonly metricType: MetricType;
    public readonly value: number;
    public readonly unit?: string;

    constructor(data: {
        id?: number;
        exerciseSetId?: number;
        metricType: MetricType;
        value: number;
        unit?: string;
    }) {
        this.id = data.id;
        this.exerciseSetId = data.exerciseSetId;
        this.metricType = data.metricType;
        this.value = data.value;
        this.unit = data.unit;
    }
}