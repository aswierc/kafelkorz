import { defineConfig, devices } from '@playwright/test'

const port = 4173
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: 3,
  use: {
    baseURL: 'http://localhost:' + port,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'iphone', use: { ...devices['iPhone 14'] } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev -- --port ' + port + ' --strictPort',
    url: 'http://localhost:' + port,
    reuseExistingServer: !process.env.CI,
  },
})
