import { mkdtemp, readFile, readdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { runPersistentAgentWatch } from './runPersistentAgentWatch';

/**
 * Creates one temporary directory used for persistent watch log assertions.
 */
async function createTemporaryLogDirectory(): Promise<string> {
    return mkdtemp(join(tmpdir(), 'ptbk-persistent-agent-watch-'));
}

describe('runPersistentAgentWatch', () => {
    let temporaryLogDirectoryPath: string | undefined;
    let consoleErrorSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;

    beforeEach(() => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(async () => {
        consoleErrorSpy.mockRestore();

        if (temporaryLogDirectoryPath) {
            await rm(temporaryLogDirectoryPath, { recursive: true, force: true });
            temporaryLogDirectoryPath = undefined;
        }
    });

    it('restarts the watch when it throws and persists the failure log before continuing', async () => {
        temporaryLogDirectoryPath = await createTemporaryLogDirectory();
        let runCount = 0;

        await runPersistentAgentWatch(
            {
                commandDisplayName: 'ptbk agent run-agent',
                logDirectoryPath: temporaryLogDirectoryPath,
                runWatch: async () => {
                    runCount++;

                    if (runCount === 1) {
                        throw new Error('Watch crashed');
                    }
                },
            },
            {
                shouldContinue: () => runCount < 2,
                restartDelayMs: 0,
            },
        );

        expect(runCount).toBe(2);
        const errorLogFileName = (await readdir(temporaryLogDirectoryPath)).find((fileName) =>
            /^ptbk-agent-error-.*\.log$/u.test(fileName),
        );

        expect(errorLogFileName).toBeDefined();
        expect(await readFile(join(temporaryLogDirectoryPath, errorLogFileName!), 'utf-8')).toContain('Watch crashed');
        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('restarts the watch when it returns unexpectedly and logs the restart reason', async () => {
        temporaryLogDirectoryPath = await createTemporaryLogDirectory();
        let runCount = 0;

        await runPersistentAgentWatch(
            {
                commandDisplayName: 'ptbk agent run-multiple',
                logDirectoryPath: temporaryLogDirectoryPath,
                runWatch: async () => {
                    runCount++;
                },
            },
            {
                shouldContinue: () => runCount < 2,
                restartDelayMs: 0,
            },
        );

        expect(runCount).toBe(2);
        const errorLogFileName = (await readdir(temporaryLogDirectoryPath)).find((fileName) =>
            /^ptbk-agent-error-.*\.log$/u.test(fileName),
        );

        expect(errorLogFileName).toBeDefined();
        expect(await readFile(join(temporaryLogDirectoryPath, errorLogFileName!), 'utf-8')).toContain(
            '`ptbk agent run-multiple` stopped unexpectedly without a shutdown request.',
        );
    });

    it('does not log an unexpected stop when the supervisor itself is asked to stop', async () => {
        temporaryLogDirectoryPath = await createTemporaryLogDirectory();
        let runCount = 0;

        await runPersistentAgentWatch(
            {
                commandDisplayName: 'ptbk agent run-agent',
                logDirectoryPath: temporaryLogDirectoryPath,
                runWatch: async () => {
                    runCount++;
                },
            },
            {
                shouldContinue: () => runCount < 1,
                restartDelayMs: 0,
            },
        );

        expect(runCount).toBe(1);
        expect(
            (await readdir(temporaryLogDirectoryPath)).find((fileName) => /^ptbk-agent-error-.*\.log$/u.test(fileName)),
        ).toBeUndefined();
    });
});

