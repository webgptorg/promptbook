import { mkdtemp, readFile, rm, stat, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { buildScriptLogPath } from './buildScriptLogPath';
import { withPromptRuntimeLog } from './withPromptRuntimeLog';

describe('withPromptRuntimeLog', () => {
    let temporaryDirectoryPath: string;

    beforeEach(async () => {
        temporaryDirectoryPath = await mkdtemp(join(tmpdir(), 'promptbook-prompt-runtime-log-'));
    });

    afterEach(async () => {
        await rm(temporaryDirectoryPath, { recursive: true, force: true });
    });

    it('deletes the temporary runtime log file after a successful prompt round by default', async () => {
        const scriptPath = join(temporaryDirectoryPath, 'prompt-1.sh');
        const logPath = buildScriptLogPath(scriptPath);

        await withPromptRuntimeLog(scriptPath, async (providedLogPath) => {
            expect(providedLogPath).toBe(logPath);

            await writeFile(providedLogPath, 'temporary debug output', 'utf-8');
            await expect(readFile(providedLogPath, 'utf-8')).resolves.toBe('temporary debug output');
        });

        await expect(stat(logPath)).rejects.toMatchObject({ code: 'ENOENT' });
    });

    it('keeps the temporary runtime log file after a successful prompt round when preservation is enabled', async () => {
        const scriptPath = join(temporaryDirectoryPath, 'prompt-2.sh');
        const logPath = buildScriptLogPath(scriptPath);

        await withPromptRuntimeLog(
            scriptPath,
            async (providedLogPath) => {
                await writeFile(providedLogPath, 'temporary debug output', 'utf-8');
            },
            { preserveArtifactsOnSuccess: true },
        );

        await expect(readFile(logPath, 'utf-8')).resolves.toBe('temporary debug output');
    });

    it('keeps the temporary runtime log file after a failed prompt round', async () => {
        const scriptPath = join(temporaryDirectoryPath, 'prompt-3.sh');
        const logPath = buildScriptLogPath(scriptPath);

        await expect(
            withPromptRuntimeLog(scriptPath, async (providedLogPath) => {
                await writeFile(providedLogPath, 'temporary debug output', 'utf-8');
                throw new Error('Expected prompt failure');
            }),
        ).rejects.toThrow('Expected prompt failure');

        await expect(readFile(logPath, 'utf-8')).resolves.toBe('temporary debug output');
    });

    it('removes any stale runtime log before reusing the same prompt path', async () => {
        const scriptPath = join(temporaryDirectoryPath, 'prompt-4.sh');
        const logPath = buildScriptLogPath(scriptPath);

        await writeFile(logPath, 'stale output', 'utf-8');

        await withPromptRuntimeLog(scriptPath, async (providedLogPath) => {
            expect(providedLogPath).toBe(logPath);
            await expect(stat(providedLogPath)).rejects.toMatchObject({ code: 'ENOENT' });
        });

        await expect(stat(logPath)).rejects.toMatchObject({ code: 'ENOENT' });
    });
});
