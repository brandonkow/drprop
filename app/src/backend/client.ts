/**
 * The Supabase client for supabase mode. Native: the session lives in the keychain,
 * on this device only. Web: in sessionStorage for this tab, cleared on sign-out.
 */
import 'react-native-url-polyfill/auto';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { runtime } from './config';
import { secureSessionStorage } from './secure-session';

const STORAGE_KEY = 'drprop.auth.v1';

const nativeStorage = secureSessionStorage({
  getItemAsync: SecureStore.getItemAsync,
  setItemAsync: (key, value) =>
    SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
  deleteItemAsync: SecureStore.deleteItemAsync,
});

const webStorage = {
  getItem: (key: string) => (typeof window === 'undefined' ? null : window.sessionStorage.getItem(key)),
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined') window.sessionStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(key);
  },
};

let instance: SupabaseClient | null = null;

export function backendClient(): SupabaseClient {
  if (runtime.mode !== 'supabase') throw new Error('Supabase mode is not configured');
  instance ??= createClient(runtime.url, runtime.key, {
    auth: {
      storageKey: STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      ...(Platform.OS === 'web' ? { storage: webStorage } : { storage: nativeStorage, lock: processLock }),
    },
  });
  return instance;
}

/** Clears a saved sign-in without decoding it first (it may be corrupt). */
export async function clearSavedSignIn() {
  if (Platform.OS === 'web') webStorage.removeItem(STORAGE_KEY);
  else await nativeStorage.removeItem(STORAGE_KEY);
  await instance?.auth.signOut({ scope: 'local' });
}
