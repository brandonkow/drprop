import { configDefaults, defineConfig } from 'vitest/config';

// e2e/ holds Playwright browser tests (npm run test:e2e), not unit tests.
export default defineConfig({
  // PGlite and embedded-font rendering are memory-heavy; leave headroom for Expo/CI.
  test: { maxWorkers: 1, exclude: [...configDefaults.exclude, 'e2e/**'] },
});
