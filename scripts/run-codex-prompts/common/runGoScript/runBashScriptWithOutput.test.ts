import { mkdtemp, readFile, rm, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { $runGoScript } from './$runGoScript';
import { $runGoScriptWithOutput } from './$runGoScriptWithOutput';
import { buildScriptLogPath } from './buildScriptLogPath';

describe('runGoScript runtime logging', () => {
    let temporaryDirectoryPath: string;

    beforeEach(async () => {
        temporaryDirectoryPath = await mkdtemp(join(tmpdir(), 'promptbook-coder-runtime-log-'));
    });

    afterEach(async () => {
        await rm(temporaryDirectoryPath, { recursive: true, force: true });
    });

    it('logs raw input and live output into the runtime log file', async () => {
        const scriptPath = join(temporaryDirectoryPath, 'prompt-1.sh');
        const logPath = buildScriptLogPath(scriptPath);

        const output = await $runGoScriptWithOutput({
            scriptPath,
            logPath,
            scriptContent: spaceTrim(`
                printf 'runner stdout\\n'
                printf 'runner stderr\\n' >&2
            `),
        });

        const log = await readFile(logPath, 'utf-8');

        expect(output).toContain('runner stdout');
        expect(output).toContain('runner stderr');
        expect(log).toContain('=== runner shell started at ');
        expect(log).toContain('--- raw input ---');
        expect(log).toContain("printf 'runner stdout\\n'");
        expect(log).toContain('runner stdout');
        expect(log).toContain('runner stderr');
        expect(log).toContain('Status: succeeded');
        await expect(stat(scriptPath)).rejects.toMatchObject({ code: 'ENOENT' });
    });

    it('keeps the temp shell file after success when preservation is enabled', async () => {
        const scriptPath = join(temporaryDirectoryPath, 'prompt-keep.sh');
        const logPath = buildScriptLogPath(scriptPath);

        const output = await $runGoScriptWithOutput({
            scriptPath,
            logPath,
            preserveArtifactsOnSuccess: true,
            scriptContent: "printf 'runner stdout\\n'",
        });

        expect(output).toContain('runner stdout');
        await expect(readFile(scriptPath, 'utf-8')).resolves.toContain("printf 'runner stdout\\n'");
    });

    it('keeps both the runtime log and temp shell file after failures', async () => {
        const scriptPath = join(temporaryDirectoryPath, 'prompt-1.test.sh');
        const logPath = buildScriptLogPath(scriptPath);

        await expect(
            $runGoScript({
                scriptPath,
                logPath,
                scriptContent: spaceTrim(`
                    printf 'test failure\\n' >&2
                    exit 2
                `),
            }),
        ).rejects.toThrow();

        const log = await readFile(logPath, 'utf-8');

        expect(log).toContain('=== test shell started at ');
        expect(log).toContain('test failure');
        expect(log).toContain('Status: failed');
        await expect(readFile(scriptPath, 'utf-8')).resolves.toContain("printf 'test failure\\n' >&2");
    });
});
