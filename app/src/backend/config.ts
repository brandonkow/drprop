export type BackendConfig = { mode: 'preview' } | { mode: 'supabase'; url: string; key: string } | { mode: 'invalid'; error: string };
export function backendConfig(mode?: string, url?: string, key?: string): BackendConfig {
  if (!mode || mode === 'preview') return { mode: 'preview' };
  if (mode !== 'supabase') return { mode: 'invalid', error: 'Unknown app mode. Set EXPO_PUBLIC_APP_MODE to preview or supabase.' };
  try {
    const parsed = new URL(url ?? '');
    const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname);
    if ((parsed.protocol !== 'https:' && !(loopback && parsed.protocol === 'http:')) || parsed.pathname !== '/' || parsed.username || parsed.password || parsed.search || parsed.hash || !key?.startsWith('sb_publishable_') || key.length < 24) throw new Error();
    return { mode: 'supabase', url: parsed.origin, key };
  } catch { return { mode: 'invalid', error: 'Backend setup is incomplete. Configure the Supabase URL and publishable key, then rebuild the app.' }; }
}
export const runtime = backendConfig(process.env.EXPO_PUBLIC_APP_MODE, process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
