import { MetricType } from '../entities/enum';

// Метрики
export interface IMetricTemplate {
    metricType: MetricType;
    required: boolean;
    defaultValue?: number;
    unit?: string;
}