const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

export function toMediaUrl(url?: string | null): string {
  const value = String(url || '').trim();
  if (!value) return '';

  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:') ||
    value.startsWith('blob:') ||
    value.startsWith('//')
  ) {
    return value;
  }

  if (!API_BASE_URL) return value;
  return value.startsWith('/') ? `${API_BASE_URL}${value}` : `${API_BASE_URL}/${value}`;
}
