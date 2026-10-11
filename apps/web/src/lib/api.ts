import type {BrandKit, Brief, SceneJSON, UploadedAsset} from '@ai-video-studio/schema';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000';

export type Storyboard = {title: string; scenes: {id: string; template: string; purpose: string; durationSec: number; props: Record<string, unknown>}[]};
export type PlanResponse = {
  storyboard: Storyboard;
  sceneJson: SceneJSON;
  notes: string[];
  warnings: string[];
  usage: {input: number; output: number; cacheRead: number; cacheWrite: number};
  costUsd: number;
  attempts: number;
  mock: boolean;
  assets: UploadedAsset[];
};
export type RenderJob = {id: string; status: 'queued' | 'bundling' | 'rendering' | 'done' | 'error'; progress: number; url?: string; error?: string};
export type Health = {status: string; mockAi: boolean; hasApiKey: boolean; model: string};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(`${BASE}/api${path}`, init);
  } catch {
    throw new Error(`Cannot reach the API at ${BASE}. Start it with: npm run dev:api`);
  }
  const body = (await response.json().catch(() => ({}))) as {error?: string; issues?: string[]};
  if (!response.ok) throw new Error([body.error ?? `Request failed (${response.status})`, ...(body.issues ?? [])].join('\n'));
  return body as T;
};

const json = (method: string, body: unknown): RequestInit => ({method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});

export const api = {
  health: () => request<Health>('/health'),
  upload: (file: File, kind: 'screenshot' | 'logo', label: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('kind', kind);
    form.append('label', label);
    return request<UploadedAsset>('/uploads', {method: 'POST', body: form});
  },
  plan: (brand: BrandKit, brief: Brief, mock: boolean) => request<PlanResponse>('/plan', json('POST', {brand, brief, mock})),
  saveProject: (project: {id?: string; name: string; brand: BrandKit; brief: Brief; plan?: unknown}) =>
    request<{id: string; updatedAt: string}>('/projects', json('POST', project)),
  listProjects: () => request<{id: string; name: string; updatedAt: string}[]>('/projects'),
  getProject: (id: string) => request<{id: string; name: string; brand: BrandKit; brief: Brief; plan?: PlanResponse}>(`/projects/${id}`),
  startRender: (sceneJson: SceneJSON, brand: BrandKit, preset: 'draft' | 'final') => request<RenderJob>('/render', json('POST', {sceneJson, brand, preset})),
  renderStatus: (id: string) => request<RenderJob>(`/render/${id}`),
};

/** Shrinks big screenshots in the browser before upload (max 1600px), keeping uploads fast and cheap to analyse. */
export const downscaleImage = async (file: File, maxSide = 1600): Promise<File> => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 2_000_000) return file;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));
  return blob ? new File([blob], file.name, {type}) : file;
};
