/**
 * Browser tests (`npm run test:e2e`): the built website, and the app's preview
 * journey from its web export. Uses the Chromium Playwright finds
 * (PLAYWRIGHT_BROWSERS_PATH, or `npx playwright install chromium`).
 *
 *   npm run build                                  # website → web/dist
 *   cd app && npx expo export -p web && cd ..      # app → app/dist (for the app tests)
 *   npm run test:e2e
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
  ],
  webServer: [
    { command: 'npm run preview -w @drprop/web -- --port 4173 --strictPort --host 127.0.0.1', url: 'http://127.0.0.1:4173', reuseExistingServer: true },
    // The app is a single-page export: every route falls back to index.html.
    { command: 'node e2e/serve-spa.mjs app/dist 4174', url: 'http://127.0.0.1:4174', reuseExistingServer: true },
  ],
});
