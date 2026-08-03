'use strict';

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
 * Shared environment variables required by deterministic E2E builds and runs.
 */
const APP_E2E_ENV = Object.freeze({
    ADMIN_PASSWORD: 'e2e-admin-password',
    SESSION_SECRET: 'e2e-session-secret-must-differ-from-admin-password',
    PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN: 'e2e-user-chat-worker-token-must-differ-from-admin-password',
    PROMPTBOOK_TEAM_AGENT_ACCESS_TOKEN: 'e2e-team-agent-access-token-must-differ-from-admin-password',
    NEXT_DIST_DIR: '.next-e2e',
    NEXT_PUBLIC_SITE_URL: APP_URL,
    PTBK_AGENTS_SERVER_DATABASE: 'supabase',
    PTBK_AGENTS_SERVER_SQLITE_PATH: '',
    SUPABASE_TABLE_PREFIX: '',
    POSTGRES_URL: '',
    DATABASE_URL: '',
    NEXT_PUBLIC_SUPABASE_URL: MOCK_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.e2e-signature',
    SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6InNlcnZpY2Vfcm9sZSJ9.e2e-signature',
});

module.exports = {
    APP_E2E_ENV,
    APP_PORT,
    APP_URL,
    MOCK_SUPABASE_PORT,
    MOCK_SUPABASE_URL,
};
