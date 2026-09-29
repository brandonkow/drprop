import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/backend-app', timeout: 90_000, expect: { timeout: 20_000 }, workers: 1,
  use: { browserName: 'chromium', channel: 'msedge', baseURL: 'http://127.0.0.1:4176', viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', trace: 'retain-on-failure' },
  webServer: { command: 'node node_modules/vite/bin/vite.js preview --outDir app/dist-backend-qa --host 127.0.0.1 --port 4176 --strictPort', url: 'http://127.0.0.1:4176', reuseExistingServer: false, timeout: 60_000 },
});
