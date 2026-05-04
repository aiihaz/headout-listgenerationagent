import { getSessionToken } from './supabase';
import type { ApiRun, RunDetail, RunStatus } from '../types';

export interface RunStatusResponse {
  id: string;
  status: RunStatus;
  error_message?: string | null;
  supplier_name?: string | null;
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

async function headers(): Promise<HeadersInit> {
  const token = await getSessionToken();
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...(await headers()), ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  createRun(supplierInput: string, experienceName?: string): Promise<{ run_id: string; status: string }> {
    return request('/api/v1/runs', {
      method: 'POST',
      body: JSON.stringify({ supplier_input: supplierInput, experience_name: experienceName || undefined }),
    });
  },

  getRunStatus(runId: string): Promise<RunStatusResponse> {
    return request(`/api/v1/runs/${runId}/status`);
  },

  getRun(runId: string): Promise<RunDetail> {
    return request(`/api/v1/runs/${runId}`);
  },

  listRuns(limit = 50): Promise<ApiRun[]> {
    return request(`/api/v1/runs?limit=${limit}`);
  },

  patchField(runId: string, fieldPath: string, resolvedValue: unknown): Promise<{ success: boolean }> {
    return request(`/api/v1/runs/${runId}/fields`, {
      method: 'PATCH',
      body: JSON.stringify({ field_path: fieldPath, resolved_value: resolvedValue }),
    });
  },

  publishRun(runId: string): Promise<{ run_id: string; status: string }> {
    return request(`/api/v1/runs/${runId}/publish`, { method: 'POST' });
  },

  regenerateSection(runId: string, section: string, fixInstruction: string): Promise<{ status: string }> {
    return request(`/api/v1/runs/${runId}/regenerate`, {
      method: 'POST',
      body: JSON.stringify({ section, fix_instruction: fixInstruction }),
    });
  },

  async uploadImage(runId: string, file: File): Promise<{ url: string }> {
    const token = await getSessionToken();
    const form = new FormData();
    form.append('file', file);
    const h: HeadersInit = {};
    if (token) h['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}/api/v1/runs/${runId}/images`, {
      method: 'POST',
      headers: h,
      body: form,
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  },
};
