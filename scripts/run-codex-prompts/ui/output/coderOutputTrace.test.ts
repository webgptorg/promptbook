import { mkdtemp, readFile, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { spaceTrim } from 'spacetrim';
import moment from 'moment';
import { spawn } from 'child_process';
import { $spawnLoggedBashScript } from '../../common/runGoScript/$spawnLoggedBashScript';
import { $runGoScriptWithOutput } from '../../common/runGoScript/$runGoScriptWithOutput';
import { subscribeToLiveScriptOutput } from '../../common/runGoScript/captureLiveScriptOutput';
import { CoderRunUiState } from '../CoderRunUiState';

jest.mock('../../common/runGoScript/$spawnLoggedBashScript', () => ({ $spawnLoggedBashScript: jest.fn() }));

describe('original runtime trace survives display projection', () => {
    it('runs the same local command and keeps complete raw log records in each view', async () => {
        const projectPath = await mkdtemp(join(tmpdir(), 'ptbk-output-trace-'));
        const recording = await readFile(join(__dirname, 'fixtures', 'claude-code.jsonl'), 'utf8');
        await writeFile(join(projectPath, 'recording.jsonl'), recording);
        // Replace only the OS shell boundary with a portable local fixture. Production capture, settlement,
        // temporary artifacts and runtime-log headers/footers still run normally on every platform.
        jest.mocked($spawnLoggedBashScript).mockImplementation((options) =>
            spawn(process.execPath, [join(__dirname, 'fixtures', 'traceHarness.cjs'), options.logPath!], {
                cwd: options.projectPath,
                stdio: 'pipe',
                windowsHide: true,
            }),
        );
        const results: unknown[] = [];
        try {
            for (const mode of ['normal', 'raw', 'switching']) {
                const state = new CoderRunUiState(moment());
                state.setConfig({ agentName: 'claude-code' });
                if (mode === 'raw') state.toggleOutputMode();
                const stopCapture = subscribeToLiveScriptOutput((chunk, source) => {
                    state.addScriptOutput(chunk, source);
                    if (mode === 'switching') state.toggleOutputMode();
                    return true;
                });
                const logPath = join(projectPath, `${mode}.log`);
                try {
                    const output = await $runGoScriptWithOutput({
                        projectPath,
                        logPath,
                        scriptPath: join(projectPath, 'task.sh'),
                        scriptContent: spaceTrim(`
                            cat recording.jsonl
                            printf 'observable file change\\n' > result.txt
                        `),
                    });
                    state.flushOutput();
                    const log = await readFile(logPath, 'utf8');
                    expect(log).toContain(recording);
                    expect(log).toContain('Status: succeeded');
                    expect(state.output.rawChunks.map((chunk) => chunk.text).join('')).toBe(recording);
                    results.push({
                        output,
                        file: await readFile(join(projectPath, 'result.txt'), 'utf8'),
                        events: state.output.events,
                    });
                } finally {
                    stopCapture();
                }
            }
            expect(results[1]).toEqual(results[0]);
            expect(results[2]).toEqual(results[0]);
        } finally {
            await rm(projectPath, { recursive: true, force: true });
        }
    }, 30_000);
});
