const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface RequestOptions extends RequestInit {
  token?: string;
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function getRefreshedToken(): Promise<string | null> {
  // Import dynamically to avoid circular dependency
  const { useAuthStore } = await import('@/stores/auth');
  return useAuthStore.getState().refreshAccessToken();
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  // Handle 401 with token refresh
  if (response.status === 401 && token) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = getRefreshedToken();
    }

    const newToken = await refreshPromise;
    isRefreshing = false;
    refreshPromise = null;

    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      response = await fetch(`${API_BASE}${endpoint}`, {
        ...fetchOptions,
        headers,
      });
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  const data = await response.json();
  return data.data || data;
}

export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onDone: (conversationId: string) => void;
  onError: (error: string) => void;
}

export const api = {
  get: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, { method: 'GET', token }),

  post: <T>(endpoint: string, body: unknown, token?: string) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body), token }),

  put: <T>(endpoint: string, body: unknown, token?: string) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body), token }),

  delete: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, { method: 'DELETE', token }),

  upload: async <T>(endpoint: string, formData: FormData, token?: string): Promise<T> => {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    const data = await response.json();
    return (data.data || data) as T;
  },

  stream: async (
    endpoint: string,
    body: unknown,
    callbacks: StreamCallbacks,
    token?: string
  ): Promise<void> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Stream request failed' }));
      callbacks.onError(error.error || 'Stream request failed');
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError('No response body');
      return;
    }

    const decoder = new TextDecoder();
    let conversationId = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n').filter((line) => line.startsWith('data: '));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.error) {
              callbacks.onError(data.error);
              return;
            }

            if (data.conversationId) {
              conversationId = data.conversationId;
            }

            if (data.done) {
              callbacks.onDone(conversationId);
              return;
            }

            if (data.chunk) {
              callbacks.onChunk(data.chunk);
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
      callbacks.onDone(conversationId);
    } catch (error) {
      callbacks.onError(error instanceof Error ? error.message : 'Stream reading failed');
    }
  },
};
