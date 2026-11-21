// Central AWS integration configuration.
// The browser never calls AWS AI services directly: calls go through API Gateway → Lambda,
// which hold IAM credentials. When VITE_USE_AWS is not "true", local simulations are used.
export const awsConfig = {
  enabled: import.meta.env.VITE_USE_AWS === "true",
  region: import.meta.env.VITE_AWS_REGION ?? "eu-west-2",
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
  cognito: {
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID ?? "",
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID ?? "",
  },
  sagemakerEndpoint: import.meta.env.VITE_SAGEMAKER_ENDPOINT ?? "blendquoin-deviation-v1",
  bedrockModelId: import.meta.env.VITE_BEDROCK_MODEL_ID ?? "anthropic.claude-sonnet-5-5",
  documentBucket: import.meta.env.VITE_S3_DOCUMENT_BUCKET ?? "blendquoin-documents",
};

export type AiSource = "simulated" | "aws";

export interface AwsServiceDescriptor {
  service: string;
  purpose: string;
  endpoint: string;
  status: "Simulated locally" | "Connected";
}

export const AWS_SERVICES: AwsServiceDescriptor[] = [
  { service: "Amazon SageMaker AI", purpose: "Batch deviation prediction (viscosity, appearance)", endpoint: "POST /predictions → InvokeEndpoint", status: "Simulated locally" },
  { service: "Amazon Bedrock", purpose: "Investigation note classification and summaries", endpoint: "POST /assistant/* → InvokeModel", status: "Simulated locally" },
  { service: "Amazon Textract", purpose: "Laboratory report and CoA extraction", endpoint: "POST /documents/{id}/extract → AnalyzeDocument", status: "Simulated locally" },
  { service: "Amazon S3", purpose: "Datasets, uploaded documents and report archives", endpoint: "Pre-signed PUT via POST /documents", status: "Simulated locally" },
  { service: "Amazon DynamoDB", purpose: "Batches, lots, genealogy edges and investigations", endpoint: "/batches, /lots, /genealogy, /investigations", status: "Simulated locally" },
  { service: "AWS Lambda", purpose: "API handlers and processing workflows", endpoint: "API Gateway integrations", status: "Simulated locally" },
  { service: "Amazon Cognito", purpose: "User authentication and team roles", endpoint: "User pool + hosted UI", status: "Simulated locally" },
  { service: "Amazon CloudWatch", purpose: "Model latency, drift and API monitoring", endpoint: "PutMetricData via Lambda", status: "Simulated locally" },
].map((s) => ({ ...s, status: awsConfig.enabled ? "Connected" : "Simulated locally" })) as AwsServiceDescriptor[];
