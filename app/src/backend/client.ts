import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import { runtime } from './config';
import { secureSessionStorage } from './secure-session';
let instance: SupabaseClient | null = null;
const nativeStorage = secureSessionStorage({
  getItemAsync: SecureStore.getItemAsync,
  setItemAsync: (key, value) => SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
  deleteItemAsync: SecureStore.deleteItemAsync,
});
// Recovery must not first decode a corrupt persisted session through the Auth SDK.
export async function clearSavedSignIn() {
  if (Platform.OS === 'web') { if (typeof window !== 'undefined') window.sessionStorage.removeItem('drprop.auth.v1'); }
  else await nativeStorage.removeItem('drprop.auth.v1');
  const result = await instance?.auth.signOut({ scope: 'local' });
  if (result?.error) throw result.error;
}
export function backendClient() {
  if (runtime.mode !== 'supabase') throw new Error('Supabase mode is not configured');
  if (!instance) instance = createClient(runtime.url, runtime.key, {
    auth: {
      storageKey: 'drprop.auth.v1', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false,
      ...(Platform.OS !== 'web' ? { lock: processLock, storage: nativeStorage } : { storage: {
        getItem: (key: string) => typeof window === 'undefined' ? null : window.sessionStorage.getItem(key),
        setItem: (key: string, value: string) => { if (typeof window !== 'undefined') window.sessionStorage.setItem(key, value); },
        removeItem: (key: string) => { if (typeof window !== 'undefined') window.sessionStorage.removeItem(key); },
      } }),
    },
  });
  return instance;
}
