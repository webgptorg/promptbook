import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadAgentsServerProjectEnvironment } from './startAgentsServer';

/**
 * Explicit installed environment variable used by standalone VPS launches.
 */
const PTBK_AGENTS_SERVER_ENV_FILE_ENV = 'PTBK_AGENTS_SERVER_ENV_FILE';

/**
 * Original environment restored after each env-loader test.
 */
const ORIGINAL_ENVIRONMENT = { ...process.env };

describe('loadAgentsServerProjectEnvironment', () => {
    let temporaryDirectory: string;

    beforeEach(() => {
        temporaryDirectory = mkdtempSync(join(tmpdir(), 'promptbook-start-agents-server-'));
        process.env = { ...ORIGINAL_ENVIRONMENT };
        delete process.env[PTBK_AGENTS_SERVER_ENV_FILE_ENV];
        delete process.env.OPENAI_API_KEY;
        delete process.env.PTBK_OPENAI_CODEX_USE_API_KEY;
    });

    afterEach(() => {
        process.env = { ...ORIGINAL_ENVIRONMENT };
        rmSync(temporaryDirectory, { recursive: true, force: true });
    });

    it('prefers the explicit installed env file when PTBK_AGENTS_SERVER_ENV_FILE is set', () => {
        const launchWorkingDirectory = join(temporaryDirectory, 'launch');
        const explicitEnvFilePath = join(temporaryDirectory, 'installed.env');

        mkdirSync(launchWorkingDirectory, { recursive: true });
        writeFileSync(
            explicitEnvFilePath,
            ['OPENAI_API_KEY=installed-key', 'PTBK_OPENAI_CODEX_USE_API_KEY=1'].join('\n'),
            'utf-8',
        );
        writeFileSync(
            join(launchWorkingDirectory, '.env'),
            ['OPENAI_API_KEY=launch-key', 'PTBK_OPENAI_CODEX_USE_API_KEY=0'].join('\n'),
            'utf-8',
        );

        process.env[PTBK_AGENTS_SERVER_ENV_FILE_ENV] = explicitEnvFilePath;
        process.env.OPENAI_API_KEY = 'ambient-key';
        process.env.PTBK_OPENAI_CODEX_USE_API_KEY = '0';

        loadAgentsServerProjectEnvironment(launchWorkingDirectory);

        expect(process.env.OPENAI_API_KEY).toBe('installed-key');
        expect(process.env.PTBK_OPENAI_CODEX_USE_API_KEY).toBe('1');
    });

    it('falls back to the launch-directory .env when the explicit installed env file is unavailable', () => {
        const launchWorkingDirectory = join(temporaryDirectory, 'launch');

        mkdirSync(launchWorkingDirectory, { recursive: true });
        writeFileSync(
            join(launchWorkingDirectory, '.env'),
            ['OPENAI_API_KEY=launch-key', 'PTBK_OPENAI_CODEX_USE_API_KEY=1'].join('\n'),
            'utf-8',
        );

        process.env[PTBK_AGENTS_SERVER_ENV_FILE_ENV] = join(temporaryDirectory, 'missing.env');

        loadAgentsServerProjectEnvironment(launchWorkingDirectory);

        expect(process.env.OPENAI_API_KEY).toBe('launch-key');
        expect(process.env.PTBK_OPENAI_CODEX_USE_API_KEY).toBe('1');
    });
});
