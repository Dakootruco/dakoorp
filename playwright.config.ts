import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://127.0.0.1:5190', trace: 'retain-on-failure' },
  webServer: {
    command: 'pnpm --filter web dev --port 5190',
    url: 'http://127.0.0.1:5190',
    reuseExistingServer: false,
    env: { APP_ENV: 'development' },
  },
})
