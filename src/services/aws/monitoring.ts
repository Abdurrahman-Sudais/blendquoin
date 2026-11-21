// Amazon CloudWatch adapter. In demo mode events are kept in-memory for the Integrations page.
import { awsConfig } from "./config";
import { apiRequest } from "./apiClient";

export interface MetricEvent {
  name: string;
  value: number;
  unit: string;
  at: string;
}

const buffer: MetricEvent[] = [];

export function recordMetric(name: string, value: number, unit = "Count") {
  const evt = { name, value, unit, at: new Date().toISOString() };
  buffer.unshift(evt);
  buffer.splice(50);
  if (awsConfig.enabled) void apiRequest("/metrics", { method: "POST", body: JSON.stringify(evt) }).catch(() => undefined);
}

export function recentMetrics() {
  return [...buffer];
}
