// Prefer the same base URL as the rest of the app (axios api.ts),
// falling back to relative "/api" during local development.
const BASE_API_URL = process.env.REACT_APP_API_URL || '/api';

function getApiToken(): string | null {
  try {
    // Prefer the same token key used by the rest of the app.
    return localStorage.getItem('token') || localStorage.getItem('apiToken');
  } catch {
    return null;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: any,
): Promise<T> {
  const token = getApiToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Token ${token}`;
    headers['X-API-KEY'] = token;
  }

  const isAbsolute = /^https?:\/\//i.test(endpoint);
  const url = isAbsolute
    ? endpoint
    : `${BASE_API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  let data: any = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message = (data && (data.error || data.message)) || res.statusText || 'Request failed';
    const error: any = new Error(message);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data as T;
}

