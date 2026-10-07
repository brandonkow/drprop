/**
 * Browser tests (`npm run test:e2e`): the built website, and the app's preview
 * journey from its web export. Uses the Chromium Playwright finds
 * (PLAYWRIGHT_BROWSERS_PATH, or `npx playwright install chromium`).
 *
 *   npm run build                                      # website → web/dist
 *   npm run export:web -w @drprop/app                  # preview app → app/dist
 *   npm run export:connected-fixture -w @drprop/app    # supabase-mode app → app/dist-connected
 *   npm run test:e2e
 *
 * Both exports use --clear: Expo inlines EXPO_PUBLIC_* while transforming, so a cached
 * transform from the other mode would otherwise leak in (a "preview" build that talks to
 * the backend). The connected build points at e2e/fake-supabase.mjs: never deploy it.
 */
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: { headless: true, launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } },
  projects: [
    { name: 'web', testMatch: /web\.spec\.ts/, use: { baseURL: 'http://127.0.0.1:4173' } },
    { name: 'app', testMatch: /app\.spec\.ts/, use: { baseURL: 'http://127.0.0.1:4174', viewport: { width: 390, height: 844 } } },
    { name: 'connected', testMatch: /connected\.spec\.ts/, use: { baseURL: 'http://127.0.0.1:4175', viewport: { width: 390, height: 844 } } },
  ],
  webServer: [
    { command: 'npm run preview -w @drprop/web -- --port 4173 --strictPort --host 127.0.0.1', url: 'http://127.0.0.1:4173', reuseExistingServer: true },
    // The app is a single-page export: every route falls back to index.html.
    { command: 'node e2e/serve-spa.mjs app/dist 4174', url: 'http://127.0.0.1:4174', reuseExistingServer: true },
    { command: 'node e2e/serve-spa.mjs app/dist-connected 4175', url: 'http://127.0.0.1:4175', reuseExistingServer: true },
    // A fresh database per run: the connected tests expect the seeded state.
    { command: 'node e2e/fake-supabase.mjs 54321', url: 'http://127.0.0.1:54321/auth/v1/health', reuseExistingServer: false },
  ],
});
