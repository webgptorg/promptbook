import { mkdtemp, readFile, writeFile, rm } from 'fs/promises';
import { readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import moment from 'moment';
import { PROMPT_RUNNER_HARNESS_NAMES } from '../../../../src/cli/cli-commands/common/promptRunnerCliOptions';
import { $runGoScript } from '../../common/runGoScript/$runGoScript';
import { $runGoScriptWithOutput } from '../../common/runGoScript/$runGoScriptWithOutput';
import { $runGoScriptUntilMarkerIdle } from '../../common/runGoScript/$runGoScriptUntilMarkerIdle';
import { subscribeToLiveScriptOutput } from '../../common/runGoScript/captureLiveScriptOutput';
import { printLiveScriptChunk } from '../../common/runGoScript/printLiveScriptChunk';
import type { RunGoScriptOptions } from '../../common/runGoScript/RunGoScriptOptions';
import { resolvePromptRunner } from '../../main/resolvePromptRunner';
import { runPromptWithTestFeedback } from '../../testing/runPromptWithTestFeedback';
import { CoderRunUiState } from '../CoderRunUiState';
import { buildCoderOutputLines } from './buildCoderOutputLines';

jest.mock('../../common/runGoScript/$runGoScript', () => ({ $runGoScript: jest.fn() }));
jest.mock('../../common/runGoScript/$runGoScriptWithOutput', () => ({ $runGoScriptWithOutput: jest.fn() }));
jest.mock('../../common/runGoScript/$runGoScriptUntilMarkerIdle', () => ({ $runGoScriptUntilMarkerIdle: jest.fn() }));

describe('display-independent runner execution', () => {
    let projectPath: string;
    beforeEach(async () => {
        projectPath = await mkdtemp(join(tmpdir(), 'ptbk-output-replay-'));
        jest.spyOn(console, 'info').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(async () => {
        await rm(projectPath, { recursive: true, force: true });
        jest.restoreAllMocks();
    });

    it.each(['openai-codex', 'claude-code'] as const)(
        '%s keeps a terminal harness failure identical while switching views',
        async (harnessName) => {
            const failures: string[] = [];
            const scripts: string[] = [];
            for (const mode of ['normal', 'raw', 'switching']) {
                const state = new CoderRunUiState(moment());
                if (mode === 'raw') state.toggleOutputMode();
                const stopCapture = subscribeToLiveScriptOutput((chunk, source) => {
                    state.addScriptOutput(chunk, source);
                    if (mode === 'switching') state.toggleOutputMode();
                    return true;
                });
                /** The same failed OS boundary reaches the unchanged adapter failure handler. */
                const failHarness = async (options: RunGoScriptOptions): Promise<string> => {
                    scripts.push(options.scriptContent);
                    printLiveScriptChunk('Recorded terminal failure\n', 'stderr', true);
                    throw new Error('Recorded terminal failure');
                };
                jest.mocked($runGoScriptWithOutput).mockImplementation(failHarness);
                jest.mocked($runGoScriptUntilMarkerIdle).mockImplementation(failHarness);
                try {
                    const { runner } = resolvePromptRunner({ agentName: harnessName, allowCredits: false });
                    await runner
                        .runPrompt({ projectPath, scriptPath: join(projectPath, 'task.sh'), prompt: 'Fixture task' })
                        .catch((error) => failures.push(error.message));
                } finally {
                    stopCapture();
                }
            }
            expect(failures).toEqual(Array(3).fill('Recorded terminal failure'));
            expect(scripts).toEqual(Array(3).fill(scripts[0]));
        },
    );

    it.each(PROMPT_RUNNER_HARNESS_NAMES)(
        '%s makes identical calls, verification retries and file changes in every view',
        async (harnessName) => {
            const replays: unknown[] = [];
            const recorded = readFileSync(
                join(__dirname, 'fixtures', harnessName === 'openai-codex' ? 'openai-codex.txt' : 'claude-code.jsonl'),
                'utf8',
            );
            for (const mode of ['normal', 'raw', 'switching']) {
                const state = new CoderRunUiState(moment());
                state.setConfig({ agentName: harnessName });
                const invocations: string[] = [];
                const actions: string[] = [];
                let modelCalls = 0;
                let verificationCalls = 0;
                if (mode === 'raw') state.toggleOutputMode();
                const stopCapture = subscribeToLiveScriptOutput((chunk, source) => {
                    state.addScriptOutput(chunk, source);
                    return true;
                });
                /** Replays an offline harness, including one real fixture file change per model invocation. */
                const fixtureHarness = async (options: RunGoScriptOptions): Promise<string> => {
                    modelCalls++;
                    invocations.push(options.scriptContent);
                    actions.push('tool: write result.txt');
                    await writeFile(join(projectPath, 'result.txt'), `attempt ${modelCalls}\n`);
                    for (let offset = 0; offset < recorded.length; offset += 17) {
                        printLiveScriptChunk(recorded.slice(offset, offset + 17), 'stdout', true);
                        if (mode === 'switching') state.toggleOutputMode();
                        buildCoderOutputLines({
                            mode: state.outputMode,
                            events: [...state.output.events, ...state.output.getPendingEvents()],
                            rawChunks: state.output.rawChunks,
                            width: 32,
                            height: 8,
                            scrollOffset: 0,
                            isHistoryTruncated: state.output.isHistoryTruncated,
                            revision: state.output.revision,
                        });
                    }
                    printLiveScriptChunk('diagnostic from stderr\n', 'stderr', true);
                    state.flushOutput();
                    return recorded;
                };
                jest.mocked($runGoScript).mockImplementation(async (options) => {
                    await fixtureHarness(options);
                });
                jest.mocked($runGoScriptWithOutput).mockImplementation(fixtureHarness);
                jest.mocked($runGoScriptUntilMarkerIdle).mockImplementation(fixtureHarness);
                try {
                    const { runner } = resolvePromptRunner({ agentName: harnessName, allowCredits: false });
                    const result = await runPromptWithTestFeedback({
                        runner,
                        projectPath,
                        scriptPath: join(projectPath, 'task.sh'),
                        prompt: 'Update the fixture',
                        promptLabel: 'Fixture task',
                        testCommand: 'fixture-verifier',
                        waitForPauseCheckpoint: async (checkpoint) => {
                            actions.push(checkpoint.checkpointLabel);
                        },
                        runPromptTestCommandExecutor: async () => {
                            verificationCalls++;
                            actions.push('verification');
                            if (verificationCalls === 1) throw new Error('Fixture verification requests one repair');
                            return 'PASS';
                        },
                    });
                    replays.push({
                        invocations,
                        actions,
                        modelCalls,
                        verificationCalls,
                        attempts: result.attemptCount,
                        steps: result.steps.map((step) => step.kind),
                        file: await readFile(join(projectPath, 'result.txt'), 'utf8'),
                        raw: state.output.rawChunks,
                        events: state.output.events,
                    });
                } finally {
                    stopCapture();
                }
            }
            expect(replays[1]).toEqual(replays[0]);
            expect(replays[2]).toEqual(replays[0]);
            expect(replays[0]).toMatchObject({ modelCalls: 2, verificationCalls: 2, attempts: 2, file: 'attempt 2\n' });
        },
    );
});
