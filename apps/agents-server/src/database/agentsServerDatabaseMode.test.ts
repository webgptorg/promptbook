const ORIGINAL_ENVIRONMENT = { ...process.env };

describe('agentsServerDatabaseMode', () => {
    afterEach(() => {
        jest.resetModules();
        process.env = { ...ORIGINAL_ENVIRONMENT };
    });

    it('treats postgres as a standalone direct database backend', async () => {
        process.env = {
            ...ORIGINAL_ENVIRONMENT,
            PTBK_AGENTS_SERVER_DATABASE: 'postgres',
        };

        const {
            resolveAgentsServerDatabaseMode,
            isAgentsServerPostgresMode,
            isAgentsServerSqliteMode,
            isAgentsServerStandaloneMode,
        } = await import('./agentsServerDatabaseMode');

        expect(resolveAgentsServerDatabaseMode()).toBe('postgres');
        expect(isAgentsServerPostgresMode()).toBe(true);
        expect(isAgentsServerSqliteMode()).toBe(false);
        expect(isAgentsServerStandaloneMode()).toBe(true);
    });

    it('normalizes postgresql alias to postgres', async () => {
        process.env = {
            ...ORIGINAL_ENVIRONMENT,
            PTBK_AGENTS_SERVER_DATABASE: 'postgresql',
        };

        const { resolveAgentsServerDatabaseMode } = await import('./agentsServerDatabaseMode');

        expect(resolveAgentsServerDatabaseMode()).toBe('postgres');
    });

    it('treats sqlite as standalone and supabase as hosted', async () => {
        process.env = {
            ...ORIGINAL_ENVIRONMENT,
            PTBK_AGENTS_SERVER_DATABASE: 'sqlite',
        };

        const { isAgentsServerStandaloneMode, isAgentsServerSqliteMode } = await import('./agentsServerDatabaseMode');

        expect(isAgentsServerSqliteMode()).toBe(true);
        expect(isAgentsServerStandaloneMode()).toBe(true);

        jest.resetModules();
        process.env = {
            ...ORIGINAL_ENVIRONMENT,
            PTBK_AGENTS_SERVER_DATABASE: 'supabase',
        };

        const supabaseMode = await import('./agentsServerDatabaseMode');

        expect(supabaseMode.resolveAgentsServerDatabaseMode()).toBe('supabase');
        expect(supabaseMode.isAgentsServerStandaloneMode()).toBe(false);
    });
});
