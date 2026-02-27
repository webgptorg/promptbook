import { defineConfig, devices } from 'playwright/test';
import path from 'path';

/**
 * Local host and port used by the mocked Supabase API during integration tests.
 */
const MOCK_SUPABASE_PORT = 54321;

/**
 * Base URL served by the mocked Supabase API.
 */
const MOCK_SUPABASE_URL = `http://127.0.0.1:${MOCK_SUPABASE_PORT}`;

/**
 * Local host and port used by the Agents Server application during integration tests.
 */
const APP_PORT = 4440;

/**
 * Base URL served by the Agents Server application during integration tests.
 */
const APP_URL = `http://127.0.0.1:${APP_PORT}`;

/**
 * Shared environment variables required by the Agents Server in deterministic e2e runs.
 */
const APP_E2E_ENV = {
    ADMIN_PASSWORD: 'e2e-admin-password',
    NEXT_PUBLIC_SITE_URL: APP_URL,
    SERVERS: `127.0.0.1:${APP_PORT}`,
    SUPABASE_TABLE_PREFIX: '',
    NEXT_PUBLIC_SUPABASE_URL: MOCK_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.e2e-signature',
    SUPABASE_SERVICE_ROLE_KEY:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.e2e-signature',
};

/**
 * Directory under the repository root that should hold Playwright artifacts such as recorded videos.
 */
const E2E_ARTIFACTS_DIR = path.join(
    __dirname,
    '..',
    '..',
    'other',
    'integration-tests',
    'videos',
);

/**
 * Playwright configuration for Agents Server integration tests.
 */
const config = defineConfig({
    outputDir: E2E_ARTIFACTS_DIR,
    testDir: './tests/e2e',
    fullyParallel: false,
    workers: 1,
    timeout: 60 * 1000,
    expect: {
        timeout: 10 * 1000,
    },
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
    use: {
        baseURL: APP_URL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'on',
    },
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
            },
        },
    ],
    webServer: [
        {
            command: 'node ./tests/e2e/mockSupabaseServer.cjs',
            url: `${MOCK_SUPABASE_URL}/health`,
            reuseExistingServer: false,
            timeout: 30 * 1000,
            stdout: 'pipe',
            stderr: 'pipe',
            env: {
                ...process.env,
                E2E_SUPABASE_PORT: String(MOCK_SUPABASE_PORT),
            },
        },
        {
            command: 'npm run build && npm run start',
            cwd: __dirname,
            url: APP_URL,
            reuseExistingServer: false,
            timeout: 8 * 60 * 1000,
            stdout: 'pipe',
            stderr: 'pipe',
            env: {
                ...process.env,
                ...APP_E2E_ENV,
            },
        },
    ],
});

export default config;
