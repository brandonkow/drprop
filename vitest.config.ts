import { configDefaults, defineConfig } from 'vitest/config';

// e2e/ holds Playwright browser tests (npm run test:e2e), not unit tests.
export default defineConfig({
  test: { exclude: [...configDefaults.exclude, 'e2e/**'] },
});
