// Amazon SageMaker AI integration for deviation prediction.
import type { Batch, IngredientLot, Prediction, Specification } from "@/data/types";
import { predictBatch } from "../prediction/simulatedModel";
import { apiRequest } from "./apiClient";
import { awsConfig } from "./config";

/** Feature vector sent to the SageMaker endpoint (via Lambda). Keep in sync with the training pipeline. */
export function toFeatureVector(batch: Batch, lots: IngredientLot[]) {
  const coa = (materialId: string) => {
    const lot = batch.lots.map((u) => lots.find((l) => l.id === u.lotId)).find((l) => l?.materialId === materialId);
    return lot?.coaValue ?? null;
  };
  return {
    batch_id: batch.id,
    product_family: batch.productFamily,
    equipment_id: batch.equipmentId,
    carbomer_coa_cp: coa("RM-CARB"),
    shea_colour_y: coa("RM-SHEA"),
    xanthan_coa_cp: coa("RM-XAN"),
    mixing_speed_rpm: batch.mixing.mixingSpeedRpm,
    homogenizer_rpm: batch.mixing.homogenizerRpm,
    mixing_duration_min: batch.mixing.mixingDurationMin,
    emulsification_temp_c: batch.mixing.emulsificationTempC,
    cooling_rate_c_per_min: batch.mixing.coolingRateCPerMin,
  };
}

export async function getPredictions(batch: Batch, spec: Specification, lots: IngredientLot[]): Promise<Prediction[]> {
  if (awsConfig.enabled) {
    return apiRequest<Prediction[]>("/predictions", {
      method: "POST",
      body: JSON.stringify({ endpoint: awsConfig.sagemakerEndpoint, features: toFeatureVector(batch, lots), specification: spec }),
    });
  }
  return predictBatch(batch, spec, lots);
}
