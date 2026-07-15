import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@agentlab/shared';
import { api } from '@/lib/api';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  setHasHydrated: (hasHydrated: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      hasHydrated: false,

      login: async (email: string, password: string) => {
        const result = await api.post<{ user: AuthUser; token: string; refreshToken: string }>(
          '/api/auth/login',
          { email, password }
        );
        set({
          user: result.user,
          token: result.token,
          refreshToken: result.refreshToken,
          isAuthenticated: true,
        });
      },

      register: async (email: string, password: string, name?: string) => {
        const result = await api.post<{ user: AuthUser; token: string; refreshToken: string }>(
          '/api/auth/register',
          { email, password, name }
        );
        set({
          user: result.user,
          token: result.token,
          refreshToken: result.refreshToken,
          isAuthenticated: true,
        });
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return null;

        try {
          const result = await api.post<{ token: string }>('/api/auth/refresh', { refreshToken });
          set({ token: result.token });
          return result.token;
        } catch {
          get().logout();
          return null;
        }
      },

      setHasHydrated: (hasHydrated: boolean) => {
        set({ hasHydrated });
      },

      logout: () => {
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'agentlab-auth',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
