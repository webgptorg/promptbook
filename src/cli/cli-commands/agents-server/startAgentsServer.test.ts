import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadAgentsServerProjectEnvironment } from './startAgentsServer';

const ORIGINAL_OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ORIGINAL_PTBK_OPENAI_CODEX_USE_API_KEY = process.env.PTBK_OPENAI_CODEX_USE_API_KEY;
const ORIGINAL_PTBK_AGENTS_SERVER_ENV_FILE = process.env.PTBK_AGENTS_SERVER_ENV_FILE;

describe('loadAgentsServerProjectEnvironment', () => {
    afterEach(() => {
        restoreEnvironmentVariable('OPENAI_API_KEY', ORIGINAL_OPENAI_API_KEY);
        restoreEnvironmentVariable('PTBK_OPENAI_CODEX_USE_API_KEY', ORIGINAL_PTBK_OPENAI_CODEX_USE_API_KEY);
        restoreEnvironmentVariable('PTBK_AGENTS_SERVER_ENV_FILE', ORIGINAL_PTBK_AGENTS_SERVER_ENV_FILE);
    });

    it('prefers the explicit installed env file and overrides stale OpenAI Codex authentication values', async () => {
        const temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-agents-server-start-'));
        const explicitEnvFilePath = join(temporaryDirectory, 'installed.env');

        try {
            await writeFile(
                explicitEnvFilePath,
                ['OPENAI_API_KEY=server-openai-api-key', 'PTBK_OPENAI_CODEX_USE_API_KEY=1'].join('\n'),
                'utf-8',
            );
            process.env.OPENAI_API_KEY = '';
            process.env.PTBK_OPENAI_CODEX_USE_API_KEY = '0';
            process.env.PTBK_AGENTS_SERVER_ENV_FILE = explicitEnvFilePath;

            loadAgentsServerProjectEnvironment(join(temporaryDirectory, 'ignored-launch-directory'));

            expect(process.env.OPENAI_API_KEY).toBe('server-openai-api-key');
            expect(process.env.PTBK_OPENAI_CODEX_USE_API_KEY).toBe('1');
        } finally {
            await rm(temporaryDirectory, { recursive: true, force: true });
        }
    });

    it('keeps existing environment values when only the launch-directory .env is available', async () => {
        const temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-agents-server-start-'));

        try {
            await writeFile(join(temporaryDirectory, '.env'), 'OPENAI_API_KEY=launch-directory-openai-api-key\n', 'utf-8');
            delete process.env.PTBK_AGENTS_SERVER_ENV_FILE;
            process.env.OPENAI_API_KEY = 'already-configured-openai-api-key';

            loadAgentsServerProjectEnvironment(temporaryDirectory);

            expect(process.env.OPENAI_API_KEY).toBe('already-configured-openai-api-key');
        } finally {
            await rm(temporaryDirectory, { recursive: true, force: true });
        }
    });
});

/**
 * Restores one optional environment variable after a test mutates it.
 *
 * @param key - Environment variable key.
 * @param value - Original value snapshot.
 */
function restoreEnvironmentVariable(key: string, value: string | undefined): void {
    if (value === undefined) {
        delete process.env[key];
        return;
    }

    process.env[key] = value;
}
