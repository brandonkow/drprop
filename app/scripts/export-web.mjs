import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const fixture = process.argv.includes('--fixture');
const env = { ...process.env, EXPO_PUBLIC_APP_MODE: fixture ? 'supabase' : 'preview' };
if (fixture) {
  env.EXPO_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
  env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_local_fixture_only';
  env.EXPO_PUBLIC_STRIPE_TEST_ENABLED = 'true';
} else {
  delete env.EXPO_PUBLIC_SUPABASE_URL;
  delete env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  delete env.EXPO_PUBLIC_STRIPE_TEST_ENABLED;
}
const result = spawnSync(process.execPath, [require.resolve('expo/bin/cli'), 'export', '-p', 'web', '--clear', '--max-workers', '2',
  ...(fixture ? ['--output-dir', 'dist-connected'] : [])], { env, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
