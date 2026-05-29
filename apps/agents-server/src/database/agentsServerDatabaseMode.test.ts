import { afterEach, describe, expect, it } from '@jest/globals';
import {
    AGENTS_SERVER_DATABASE_ENV_NAME,
    formatAgentsServerDatabaseModeLabel,
    resolveAgentsServerDatabaseMode,
} from './agentsServerDatabaseMode';

const ORIGINAL_DATABASE_MODE = process.env[AGENTS_SERVER_DATABASE_ENV_NAME];

describe('agentsServerDatabaseMode', () => {
    afterEach(() => {
        if (ORIGINAL_DATABASE_MODE === undefined) {
            delete process.env[AGENTS_SERVER_DATABASE_ENV_NAME];
        } else {
            process.env[AGENTS_SERVER_DATABASE_ENV_NAME] = ORIGINAL_DATABASE_MODE;
        }
    });

    it('recognizes direct PostgreSQL mode aliases', () => {
        process.env[AGENTS_SERVER_DATABASE_ENV_NAME] = 'postgresql';

        expect(resolveAgentsServerDatabaseMode()).toBe('postgres');
    });

    it('keeps SQLite aliases mapped to sqlite', () => {
        process.env[AGENTS_SERVER_DATABASE_ENV_NAME] = 'local';

        expect(resolveAgentsServerDatabaseMode()).toBe('sqlite');
    });

    it('formats the database mode labels for the admin UI', () => {
        expect(formatAgentsServerDatabaseModeLabel('sqlite')).toBe('SQLite');
        expect(formatAgentsServerDatabaseModeLabel('postgres')).toBe('PostgreSQL');
        expect(formatAgentsServerDatabaseModeLabel('supabase')).toBe('Supabase');
    });
});
