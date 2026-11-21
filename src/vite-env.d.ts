/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_USE_AWS?: string;
  readonly VITE_AWS_REGION?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_COGNITO_USER_POOL_ID?: string;
  readonly VITE_COGNITO_CLIENT_ID?: string;
  readonly VITE_SAGEMAKER_ENDPOINT?: string;
  readonly VITE_BEDROCK_MODEL_ID?: string;
  readonly VITE_S3_DOCUMENT_BUCKET?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
