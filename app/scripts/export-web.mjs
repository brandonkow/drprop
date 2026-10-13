import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const fixture = process.argv.includes('--fixture');
const env = { ...process.env, EXPO_PUBLIC_APP_MODE: fixture ? 'supabase' : 'preview' };
if (fixture) {
  env.EXPO_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
  env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_local_fixture_only';
} else {
  delete env.EXPO_PUBLIC_SUPABASE_URL;
  delete env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
}
const result = spawnSync(process.execPath, [require.resolve('expo/bin/cli'), 'export', '-p', 'web', '--clear',
  ...(fixture ? ['--output-dir', 'dist-connected'] : [])], { env, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
