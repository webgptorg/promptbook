import path from 'path';
import { defineConfig, devices } from 'playwright/test';

/**
 * Shape of the shared CommonJS module used by the E2E build, server, and Playwright configuration.
 */
type E2eEnvironmentModule = {
    readonly APP_E2E_ENV: Readonly<Record<string, string>>;
    readonly APP_PORT: number;
    readonly APP_URL: string;
    readonly MOCK_SUPABASE_PORT: number;
    readonly MOCK_SUPABASE_URL: string;
};

const {
    APP_E2E_ENV,
    APP_PORT,
    APP_URL,
    MOCK_SUPABASE_PORT,
    MOCK_SUPABASE_URL,
} = require('./tests/e2e/e2eEnvironment.cjs') as E2eEnvironmentModule;

/**
 * Maximum time allowed for the production Agents Server bundle used by browser tests.
 */
const E2E_WEB_SERVER_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Directory under the repository root that should hold Playwright artifacts such as recorded videos.
 */
const E2E_ARTIFACTS_DIR = path.join(__dirname, '..', '..', 'other', 'integration-tests', 'videos');

/**
 * Uses the already prepared production build when the test runner created it.
 * Direct Playwright invocations keep the self-bootstrapping build behavior.
 */
const E2E_APP_WEB_SERVER_COMMAND =
    process.env.PTBK_E2E_BUILD_READY === 'true' ? 'npm run start' : 'node ./scripts/build-e2e.js --start';

/**
 * Environment inherited by the local E2E web servers.
 */
const PROCESS_ENVIRONMENT = process.env as Record<string, string>;

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
                ...PROCESS_ENVIRONMENT,
                E2E_SUPABASE_PORT: String(MOCK_SUPABASE_PORT),
                E2E_SERVER_NAME: 'local-e2e',
                E2E_SERVER_ENVIRONMENT: 'PREVIEW',
                E2E_SERVER_DOMAIN: `127.0.0.1:${APP_PORT}`,
                E2E_SERVER_TABLE_PREFIX: '',
            },
        },
        {
            command: E2E_APP_WEB_SERVER_COMMAND,
            cwd: __dirname,
            url: APP_URL,
            reuseExistingServer: false,
            timeout: E2E_WEB_SERVER_TIMEOUT_MS,
            stdout: 'pipe',
            stderr: 'pipe',
            env: {
                ...PROCESS_ENVIRONMENT,
                ...APP_E2E_ENV,
            },
        },
    ],
});

export default config;
