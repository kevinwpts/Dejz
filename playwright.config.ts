import { defineConfig, devices } from '@playwright/test';

/**
 * Klicktester (E2E) som går igenom appen som en användare, i demoläget med påhittade "Elin".
 * Körs automatiskt på GitHub vid varje push (se .github/workflows/ci.yml).
 * Lokalt: npm run e2e
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3100',
    ...devices['iPhone 13'],
    browserName: 'chromium',
    trace: 'off',
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  webServer: {
    // Demoläget finns bara i utvecklingsläget, därför vite (inte en byggd version)
    command: 'npx vite --port 3100 --strictPort',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
