import {
    isAgentsServerPostgresMode,
    isAgentsServerSqliteMode,
    isAgentsServerStandaloneMode,
    resolveAgentsServerDatabaseMode,
} from './agentsServerDatabaseMode';

const ORIGINAL_DATABASE_MODE = process.env.PTBK_AGENTS_SERVER_DATABASE;

describe('agentsServerDatabaseMode', () => {
    afterEach(() => {
        if (ORIGINAL_DATABASE_MODE === undefined) {
            delete process.env.PTBK_AGENTS_SERVER_DATABASE;
        } else {
            process.env.PTBK_AGENTS_SERVER_DATABASE = ORIGINAL_DATABASE_MODE;
        }
    });

    it('defaults to Supabase when no database mode is configured', () => {
        delete process.env.PTBK_AGENTS_SERVER_DATABASE;

        expect(resolveAgentsServerDatabaseMode()).toBe('supabase');
        expect(isAgentsServerStandaloneMode()).toBe(false);
    });

    it('resolves PostgreSQL aliases as the standalone postgres mode', () => {
        process.env.PTBK_AGENTS_SERVER_DATABASE = 'postgresql';

        expect(resolveAgentsServerDatabaseMode()).toBe('postgres');
        expect(isAgentsServerPostgresMode()).toBe(true);
        expect(isAgentsServerStandaloneMode()).toBe(true);
        expect(isAgentsServerSqliteMode()).toBe(false);
    });

    it('keeps sqlite mode as standalone', () => {
        process.env.PTBK_AGENTS_SERVER_DATABASE = 'sqlite';

        expect(resolveAgentsServerDatabaseMode()).toBe('sqlite');
        expect(isAgentsServerSqliteMode()).toBe(true);
        expect(isAgentsServerStandaloneMode()).toBe(true);
        expect(isAgentsServerPostgresMode()).toBe(false);
    });
});
