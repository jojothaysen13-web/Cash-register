import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setAuthToken } from '../api/client';
import * as authApi from '../api/auth';
import type { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: async (username, password) => {
        const { token, user } = await authApi.login(username, password);
        setAuthToken(token);
        set({ token, user });
      },
      logout: () => {
        setAuthToken(null);
        set({ token: null, user: null });
      },
    }),
    {
      name: 'cash-register-auth',
      onRehydrateStorage: () => (state) => {
        if (state?.token) setAuthToken(state.token);
      },
    }
  )
);
