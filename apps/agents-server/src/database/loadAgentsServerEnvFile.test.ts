import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AGENTS_SERVER_ENV_FILE_ENV_NAME, loadAgentsServerEnvFile } from './loadAgentsServerEnvFile';

/**
 * Original process environment restored after each environment-loader test.
 */
const ORIGINAL_ENVIRONMENT = { ...process.env };

describe('loadAgentsServerEnvFile', () => {
    let temporaryDirectory: string;

    beforeEach(() => {
        temporaryDirectory = mkdtempSync(join(tmpdir(), 'promptbook-agents-env-'));
    });

    afterEach(() => {
        process.env = { ...ORIGINAL_ENVIRONMENT };
        rmSync(temporaryDirectory, { recursive: true, force: true });
    });

    it('lets the explicit installer env file override ambient database variables', () => {
        const envFilePath = join(temporaryDirectory, '.env');
        const expectedSqlitePath = join(temporaryDirectory, 'installed.sqlite').replace(/\\/gu, '/');

        writeFileSync(
            envFilePath,
            [
                'PTBK_AGENTS_SERVER_DATABASE=sqlite',
                `PTBK_AGENTS_SERVER_SQLITE_PATH=${expectedSqlitePath}`,
                'SUPABASE_TABLE_PREFIX=server_Installed_',
            ].join('\n'),
            'utf-8',
        );

        process.env = {
            ...ORIGINAL_ENVIRONMENT,
            [AGENTS_SERVER_ENV_FILE_ENV_NAME]: envFilePath,
            PTBK_AGENTS_SERVER_DATABASE: 'sqlite',
            PTBK_AGENTS_SERVER_SQLITE_PATH: 'agents-server.sqlite',
            SUPABASE_TABLE_PREFIX: 'server_Ambient_',
        };

        loadAgentsServerEnvFile();

        expect(process.env.PTBK_AGENTS_SERVER_SQLITE_PATH).toBe(expectedSqlitePath);
        expect(process.env.SUPABASE_TABLE_PREFIX).toBe('server_Installed_');
    });
});
