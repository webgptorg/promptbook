/**
 * Environment values restored after every test so module-level caching does not bleed.
 */
const ORIGINAL_ENVIRONMENT = {
    PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN: process.env.PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NODE_ENV: process.env.NODE_ENV,
};

describe('resolveUserChatWorkerInternalToken', () => {
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
        delete process.env.PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN;
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        delete process.env.ADMIN_PASSWORD;
        delete process.env.NEXT_PUBLIC_SITE_URL;
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        restoreEnvironmentVariable(
            'PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN',
            ORIGINAL_ENVIRONMENT.PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN,
        );
        restoreEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY', ORIGINAL_ENVIRONMENT.SUPABASE_SERVICE_ROLE_KEY);
        restoreEnvironmentVariable('ADMIN_PASSWORD', ORIGINAL_ENVIRONMENT.ADMIN_PASSWORD);
        restoreEnvironmentVariable('NEXT_PUBLIC_SITE_URL', ORIGINAL_ENVIRONMENT.NEXT_PUBLIC_SITE_URL);
        restoreEnvironmentVariable('NODE_ENV', ORIGINAL_ENVIRONMENT.NODE_ENV);
        consoleWarnSpy.mockRestore();
    });

    it('uses the dedicated worker token environment variable when configured', () => {
        process.env.PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN = 'local-cli-worker-token';
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
        process.env.ADMIN_PASSWORD = 'admin-password';
        process.env.NEXT_PUBLIC_SITE_URL = 'https://agents.example';

        const { resolveUserChatWorkerInternalToken } = loadResolveUserChatWorkerInternalTokenModule();

        expect(resolveUserChatWorkerInternalToken()).toBe('local-cli-worker-token');
    });

    it('never falls back to SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSWORD, or NEXT_PUBLIC_SITE_URL', () => {
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
        process.env.ADMIN_PASSWORD = 'admin-password';
        process.env.NEXT_PUBLIC_SITE_URL = 'https://agents.example';

        const { resolveUserChatWorkerInternalToken } = loadResolveUserChatWorkerInternalTokenModule();
        const resolvedToken = resolveUserChatWorkerInternalToken();

        expect(resolvedToken).not.toContain('service-role-key');
        expect(resolvedToken).not.toContain('admin-password');
        expect(resolvedToken).not.toContain('agents.example');
    });

    it('throws an EnvironmentMismatchError in production when the dedicated variable is missing', () => {
        Reflect.set(process.env, 'NODE_ENV', 'production');

        const { resolveUserChatWorkerInternalToken } = loadResolveUserChatWorkerInternalTokenModule();

        let thrownError: unknown;
        try {
            resolveUserChatWorkerInternalToken();
        } catch (caughtError) {
            thrownError = caughtError;
        }

        expect(thrownError).toBeInstanceOf(Error);
        expect((thrownError as Error).name).toBe('EnvironmentMismatchError');
        expect((thrownError as Error).message).toContain('PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN');
    });

    it('generates a stable random per-process token outside production when the dedicated variable is missing', () => {
        Reflect.set(process.env, 'NODE_ENV', 'development');

        const { resolveUserChatWorkerInternalToken } = loadResolveUserChatWorkerInternalTokenModule();
        const firstResolvedToken = resolveUserChatWorkerInternalToken();
        const secondResolvedToken = resolveUserChatWorkerInternalToken();

        expect(firstResolvedToken).toMatch(/^[0-9a-f]{64}$/u);
        expect(secondResolvedToken).toBe(firstResolvedToken);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining('PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN'),
        );
    });
});

/**
 * Loads the worker-token module in isolation so each test exercises a fresh resolution cache.
 */
function loadResolveUserChatWorkerInternalTokenModule(): typeof import('./resolveUserChatWorkerInternalToken') {
    let loadedModule!: typeof import('./resolveUserChatWorkerInternalToken');
    jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        loadedModule = require('./resolveUserChatWorkerInternalToken') as typeof import('./resolveUserChatWorkerInternalToken');
    });
    return loadedModule;
}

/**
 * Restores one environment variable after worker-token tests mutate it.
 */
function restoreEnvironmentVariable(name: string, value: string | undefined): void {
    if (value === undefined) {
        delete process.env[name];
        return;
    }

    Reflect.set(process.env, name, value);
}
