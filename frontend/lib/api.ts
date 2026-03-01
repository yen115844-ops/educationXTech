import type { ApiResponse } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('xtech_token');
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({ success: false, message: 'Lỗi kết nối' }));

  if (!res.ok && !json.success) {
    return {
      success: false,
      message: json.message || 'Có lỗi xảy ra',
      code: json.code,
    };
  }
  return json as ApiResponse<T>;
}

export const apiGet = <T>(path: string) => api<T>(path, { method: 'GET' });
export const apiPost = <T>(path: string, body: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body) });
export const apiPatch = <T>(path: string, body: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
export const apiDelete = <T>(path: string) => api<T>(path, { method: 'DELETE' });

/** Upload file (e.g. thumbnail). Returns { url } on success. */
export async function apiUpload<T = { url: string; filename?: string }>(
  path: string,
  formData: FormData
): Promise<ApiResponse<T>> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('xtech_token') : null;
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', body: formData, headers });
  const json = await res.json().catch(() => ({ success: false, message: 'Lỗi kết nối' }));
  if (!res.ok && !json.success) {
    return { success: false, message: json.message || 'Upload thất bại', code: json.code };
  }
  return json as ApiResponse<T>;
}
