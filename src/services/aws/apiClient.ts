import { awsConfig } from "./config";
import { getIdToken } from "./cognito";

/** Thin fetch wrapper for the BlendQuoin API (API Gateway + Lambda). */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!awsConfig.apiBaseUrl) throw new Error("VITE_API_BASE_URL is not configured");
  const token = await getIdToken();
  const res = await fetch(`${awsConfig.apiBaseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}
