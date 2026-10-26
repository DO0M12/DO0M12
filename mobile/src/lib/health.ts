// Fallback for platforms without a health store (web). The real readers live in
// health.ios.ts (Apple Health) and health.android.ts (Health Connect); Metro picks
// the platform file automatically and all three export the same API.
import type { HealthDay } from './types';

export const HEALTH_SOURCE: string | null = null;

export async function isHealthAvailable(): Promise<boolean> {
  return false;
}

export async function requestHealthAccess(): Promise<boolean> {
  return false;
}

export async function readHealthDays(_days: number): Promise<Record<string, HealthDay>> {
  return {};
}

export function openHealthSettings(): void {}
