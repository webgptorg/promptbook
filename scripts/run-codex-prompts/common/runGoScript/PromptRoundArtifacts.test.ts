import { mkdtemp, readFile, rm, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { $runGoScript } from './$runGoScript';
import { buildScriptLogPath } from './buildScriptLogPath';
import { createCoderRunPromptRoundArtifacts } from './PromptRoundArtifacts';
import { withPromptRuntimeLog } from './withPromptRuntimeLog';

describe('PromptRoundArtifacts', () => {
    let temporaryDirectoryPath: string;

    beforeEach(async () => {
        temporaryDirectoryPath = await mkdtemp(join(tmpdir(), 'promptbook-prompt-round-artifacts-'));
    });

    afterEach(async () => {
        await rm(temporaryDirectoryPath, { recursive: true, force: true });
    });

    it('deletes runner scripts and runtime logs after successful rounds by default', async () => {
        const scriptPath = join(temporaryDirectoryPath, 'prompt-1.sh');
        const logPath = buildScriptLogPath(scriptPath);
        const promptRoundArtifacts = createCoderRunPromptRoundArtifacts(false);
        let promptRoundSucceeded = false;

        try {
            await withPromptRuntimeLog(
                scriptPath,
                async (providedLogPath) => {
                    await $runGoScript({
                        scriptPath,
                        logPath: providedLogPath,
                        scriptContent: "printf 'runner ok\\n'",
                        promptRoundArtifacts,
                    });

                    promptRoundSucceeded = true;
                },
                promptRoundArtifacts,
            );
        } finally {
            await promptRoundArtifacts.cleanup(promptRoundSucceeded ? 'success' : 'failure');
        }

        await expect(stat(scriptPath)).rejects.toMatchObject({ code: 'ENOENT' });
        await expect(stat(logPath)).rejects.toMatchObject({ code: 'ENOENT' });
    });

    it('keeps runner scripts and runtime logs after successful rounds when preservation is enabled', async () => {
        const scriptPath = join(temporaryDirectoryPath, 'prompt-2.sh');
        const logPath = buildScriptLogPath(scriptPath);
        const promptRoundArtifacts = createCoderRunPromptRoundArtifacts(true);
        let promptRoundSucceeded = false;

        try {
            await withPromptRuntimeLog(
                scriptPath,
                async (providedLogPath) => {
                    await $runGoScript({
                        scriptPath,
                        logPath: providedLogPath,
                        scriptContent: "printf 'runner ok\\n'",
                        promptRoundArtifacts,
                    });

                    promptRoundSucceeded = true;
                },
                promptRoundArtifacts,
            );
        } finally {
            await promptRoundArtifacts.cleanup(promptRoundSucceeded ? 'success' : 'failure');
        }

        await expect(readFile(scriptPath, 'utf-8')).resolves.toContain("printf 'runner ok\\n'");
        await expect(readFile(logPath, 'utf-8')).resolves.toContain('Status: succeeded');
    });

    it('keeps runner scripts and runtime logs after failed rounds even without explicit preservation', async () => {
        const scriptPath = join(temporaryDirectoryPath, 'prompt-3.sh');
        const logPath = buildScriptLogPath(scriptPath);
        const promptRoundArtifacts = createCoderRunPromptRoundArtifacts(false);
        let promptRoundSucceeded = false;

        await expect(
            (async () => {
                try {
                    await withPromptRuntimeLog(
                        scriptPath,
                        async (providedLogPath) => {
                            await $runGoScript({
                                scriptPath,
                                logPath: providedLogPath,
                                scriptContent: ["printf 'runner failed\\n' >&2", 'exit 2'].join('\n'),
                                promptRoundArtifacts,
                            });

                            promptRoundSucceeded = true;
                        },
                        promptRoundArtifacts,
                    );
                } finally {
                    await promptRoundArtifacts.cleanup(promptRoundSucceeded ? 'success' : 'failure');
                }
            })(),
        ).rejects.toThrow();

        await expect(readFile(scriptPath, 'utf-8')).resolves.toContain("printf 'runner failed\\n' >&2");
        await expect(readFile(logPath, 'utf-8')).resolves.toContain('Status: failed');
    });

    it('still deletes generated verification scripts after failed rounds', async () => {
        const runnerScriptPath = join(temporaryDirectoryPath, 'prompt-4.sh');
        const testScriptPath = join(temporaryDirectoryPath, 'prompt-4.test.sh');
        const logPath = buildScriptLogPath(runnerScriptPath);
        const promptRoundArtifacts = createCoderRunPromptRoundArtifacts(false);
        let promptRoundSucceeded = false;

        await expect(
            (async () => {
                try {
                    await withPromptRuntimeLog(
                        runnerScriptPath,
                        async (providedLogPath) => {
                            await $runGoScript({
                                scriptPath: testScriptPath,
                                logPath: providedLogPath,
                                scriptContent: ["printf 'test failed\\n' >&2", 'exit 2'].join('\n'),
                                promptRoundArtifacts,
                            });

                            promptRoundSucceeded = true;
                        },
                        promptRoundArtifacts,
                    );
                } finally {
                    await promptRoundArtifacts.cleanup(promptRoundSucceeded ? 'success' : 'failure');
                }
            })(),
        ).rejects.toThrow();

        await expect(stat(testScriptPath)).rejects.toMatchObject({ code: 'ENOENT' });
        await expect(readFile(logPath, 'utf-8')).resolves.toContain('=== test shell started at ');
    });
});
