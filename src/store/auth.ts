import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import type { AuthTokens } from '@/api/types';

const ACCESS_KEY = 'vmeste.access';
const REFRESH_KEY = 'vmeste.refresh';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

type AuthState = {
  status: AuthStatus;
  accessToken: string | null;
  refreshToken: string | null;
  hydrate: () => Promise<void>;
  setTokens: (tokens: AuthTokens) => Promise<void>;
  signOut: () => Promise<void>;
};

/** Токены живут только в expo-secure-store, в памяти — копия для заголовков. */
export const useAuth = create<AuthState>((set) => ({
  status: 'loading',
  accessToken: null,
  refreshToken: null,

  hydrate: async () => {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
    ]);
    set({
      accessToken,
      refreshToken,
      status: refreshToken ? 'signedIn' : 'signedOut',
    });
  },

  setTokens: async ({ access_token, refresh_token }) => {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, access_token),
      SecureStore.setItemAsync(REFRESH_KEY, refresh_token),
    ]);
    set({ accessToken: access_token, refreshToken: refresh_token, status: 'signedIn' });
  },

  signOut: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ]);
    set({ accessToken: null, refreshToken: null, status: 'signedOut' });
  },
}));
