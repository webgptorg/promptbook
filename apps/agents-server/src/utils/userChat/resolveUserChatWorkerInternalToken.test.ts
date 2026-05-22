import { createHash } from 'crypto';
import { resolveUserChatWorkerInternalToken } from './resolveUserChatWorkerInternalToken';

/**
 * Worker-token entropy inputs restored after every test.
 */
const ORIGINAL_ENVIRONMENT = {
    PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN: process.env.PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
};

describe('resolveUserChatWorkerInternalToken', () => {
    beforeEach(() => {
        delete process.env.PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN;
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        delete process.env.ADMIN_PASSWORD;
        delete process.env.NEXT_PUBLIC_SITE_URL;
    });

    afterEach(() => {
        restoreEnvironmentVariable(
            'PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN',
            ORIGINAL_ENVIRONMENT.PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN,
        );
        restoreEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY', ORIGINAL_ENVIRONMENT.SUPABASE_SERVICE_ROLE_KEY);
        restoreEnvironmentVariable('ADMIN_PASSWORD', ORIGINAL_ENVIRONMENT.ADMIN_PASSWORD);
        restoreEnvironmentVariable('NEXT_PUBLIC_SITE_URL', ORIGINAL_ENVIRONMENT.NEXT_PUBLIC_SITE_URL);
    });

    it('prefers the explicit Agents Server bridge token over app entropy inputs', () => {
        process.env.PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN = 'local-cli-worker-token';
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
        process.env.ADMIN_PASSWORD = 'admin-password';
        process.env.NEXT_PUBLIC_SITE_URL = 'https://agents.example';

        expect(resolveUserChatWorkerInternalToken()).toBe('local-cli-worker-token');
    });

    it('keeps deriving the token from service-role entropy without the bridge token', () => {
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
        process.env.ADMIN_PASSWORD = 'admin-password';
        process.env.NEXT_PUBLIC_SITE_URL = 'https://agents.example';

        expect(resolveUserChatWorkerInternalToken()).toBe(
            createHash('sha256').update('user-chat-worker:service-role-key').digest('hex'),
        );
    });
});

/**
 * Restores one environment variable after worker-token tests mutate it.
 */
function restoreEnvironmentVariable(name: string, value: string | undefined): void {
    if (value === undefined) {
        delete process.env[name];
        return;
    }

    process.env[name] = value;
}
