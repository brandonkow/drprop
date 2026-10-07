/**
 * Which data the app runs on, from EXPO_PUBLIC_* variables at build time (app/.env):
 *   preview  (default) the local mock in src/data/mock.ts: nothing leaves the phone.
 *   supabase the real backend in supabase/migrations: SMS sign-in, adviser slots, bookings.
 * A supabase build with a missing or unsafe setting shows a setup error. It never
 * falls back to the preview, so a real customer can't end up in simulated bookings.
 */
export type BackendConfig =
  | { mode: 'preview' }
  | { mode: 'supabase'; url: string; key: string }
  | { mode: 'invalid'; error: string };

export function backendConfig(mode?: string, url?: string, key?: string): BackendConfig {
  if (!mode || mode === 'preview') return { mode: 'preview' };
  if (mode !== 'supabase') return { mode: 'invalid', error: 'Unknown app mode. Set EXPO_PUBLIC_APP_MODE to preview or supabase.' };
  try {
    const parsed = new URL(url ?? '');
    const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname);
    const secure = parsed.protocol === 'https:' || (loopback && parsed.protocol === 'http:');
    const bare = parsed.pathname === '/' && !parsed.username && !parsed.password && !parsed.search && !parsed.hash;
    // Only a publishable key belongs in an app bundle: never a secret or service-role key.
    const publishable = !!key && key.startsWith('sb_publishable_') && key.length >= 24;
    if (!secure || !bare || !publishable) throw new Error('unsafe');
    return { mode: 'supabase', url: parsed.origin, key: key! };
  } catch {
    return { mode: 'invalid', error: 'Backend setup is incomplete. Set the Supabase URL (https) and publishable key, then rebuild.' };
  }
}

// Expo inlines EXPO_PUBLIC_* only when read exactly like this.
export const runtime = backendConfig(
  process.env.EXPO_PUBLIC_APP_MODE,
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
