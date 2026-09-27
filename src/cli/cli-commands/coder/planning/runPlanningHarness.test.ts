import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { EventEmitter } from 'events';
import { PassThrough } from 'stream';
import { $resolveHarnessCommandPath } from '../../common/harness/$resolveHarnessCommandPath';
import { buildPlanningHarnessArguments, runPlanningHarness, type PlanningHarnessOptions } from './runPlanningHarness';

jest.mock('child_process', () => ({ ...jest.requireActual('child_process'), spawn: jest.fn() }));
jest.mock('../../common/harness/$resolveHarnessCommandPath', () => ({ $resolveHarnessCommandPath: jest.fn() }));
jest.mock('../../../../../scripts/run-codex-prompts/common/runGoScript/$terminateLoggedBashProcessTree', () => ({
    $terminateLoggedBashProcessTree: jest.fn(),
}));

/** Isolated inference options; a hostile model name must also remain a single process argument. */
const OPTIONS: PlanningHarnessOptions = {
    agentName: 'openai-codex',
    model: 'model; echo injected',
    noUi: true,
    allowCredits: false,
    workspacePath: '/project/.promptbook/coder-plan/session',
    signal: new AbortController().signal,
    prompt: 'A prompt containing `commands`, $(substitution), and "quotes".',
};

/** Creates a deterministic subprocess transport without starting a shell, an LLM, or native tools. */
function createHarnessProcess(): ChildProcessWithoutNullStreams & {
    stdin: PassThrough;
    stdout: PassThrough;
    stderr: PassThrough;
} {
    return Object.assign(new EventEmitter(), {
        stdin: new PassThrough(),
        stdout: new PassThrough(),
        stderr: new PassThrough(),
        exitCode: null,
        signalCode: null,
        kill: jest.fn(),
    }) as unknown as ChildProcessWithoutNullStreams & { stdin: PassThrough; stdout: PassThrough; stderr: PassThrough };
}

describe('planning harness execution boundary', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        jest.mocked($resolveHarnessCommandPath).mockResolvedValue('/trusted/codex.exe');
    });

    it('disables shells, delegation, plugins, connectors and hooks independently of the prompt', () => {
        const argumentsList = buildPlanningHarnessArguments(OPTIONS);
        for (const feature of [
            'shell_tool',
            'unified_exec',
            'multi_agent',
            'multi_agent_v2',
            'plugins',
            'apps',
            'hooks',
            'code_mode',
            'code_mode_host',
            'workspace_dependencies',
            'shell_snapshot',
            'skill_search',
            'tool_suggest',
        ]) {
            expect(argumentsList[argumentsList.indexOf(feature) - 1]).toBe('--disable');
        }
        expect(argumentsList).toContain('read-only');
        expect(argumentsList).toContain('never');
        expect(argumentsList).toContain('--ignore-user-config');
        expect(argumentsList).toContain('--ignore-rules');
        expect(argumentsList).toContain('mcp_servers={}');
        expect(argumentsList[argumentsList.indexOf('--output-schema') + 1]).toMatch(/response\.schema\.json$/u);
        expect(argumentsList).not.toContain('--dangerously-bypass-approvals-and-sandbox');
    });

    it('passes all conversation text on stdin, uses no shell, and returns only the final model answer', async () => {
        const child = createHarnessProcess();
        jest.mocked(spawn).mockReturnValue(child);
        const answer = runPlanningHarness(OPTIONS);
        await new Promise(setImmediate);
        expect(jest.mocked(spawn).mock.calls[0]?.[2]).toMatchObject({ shell: false, cwd: OPTIONS.workspacePath });
        expect(child.stdin.read().toString()).toBe(OPTIONS.prompt);
        expect(jest.mocked(spawn).mock.calls[0]?.[1]).toContain(OPTIONS.model);
        child.stdout.write(
            JSON.stringify({
                type: 'item.completed',
                item: { type: 'agent_message', text: '{"message":"Hello","reads":[],"proposals":[]}' },
            }) + '\n',
        );
        child.emit('close', 0);
        await expect(answer).resolves.toContain('Hello');
    });

    it('rejects harness failure even when it emitted a partial answer and exited zero', async () => {
        const child = createHarnessProcess();
        jest.mocked(spawn).mockReturnValue(child);
        const answer = runPlanningHarness(OPTIONS);
        const assertion = expect(answer).rejects.toThrow('Planner harness failed');
        await new Promise(setImmediate);
        child.stdout.write(
            JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: '{}' } }) + '\n',
        );
        child.stdout.write(JSON.stringify({ type: 'turn.failed', error: { message: 'fixture failure' } }) + '\n');
        child.emit('close', 0);
        await assertion;
    });

    it('cancels an in-flight harness and refuses unsupported harnesses before spawning', async () => {
        const child = createHarnessProcess();
        jest.mocked(spawn).mockReturnValue(child);
        const controller = new AbortController();
        const answer = runPlanningHarness({ ...OPTIONS, signal: controller.signal });
        const assertion = expect(answer).rejects.toThrow('cancelled');
        await new Promise(setImmediate);
        controller.abort();
        await assertion;
        jest.mocked(spawn).mockClear();
        await expect(runPlanningHarness({ ...OPTIONS, agentName: 'claude-code' })).rejects.toThrow('only');
        expect(spawn).not.toHaveBeenCalled();
    });

    it('bounds malformed harness output even without a complete JSON line', async () => {
        const child = createHarnessProcess();
        jest.mocked(spawn).mockReturnValue(child);
        const answer = runPlanningHarness(OPTIONS);
        const assertion = expect(answer).rejects.toThrow('output exceeded');
        await new Promise(setImmediate);
        child.stdout.write('x'.repeat(2 * 1024 * 1024 + 1));
        await assertion;
    });
});

// Note: [💞] Ignore a discrepancy between file name and entity name.
