import { execFile } from 'child_process';
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join, relative } from 'path';
import { promisify } from 'util';
import { UNCERTAIN_USAGE } from '../../../src/execution/utils/usage-constants';
import type { RunOptions } from '../cli/RunOptions';
import type { PromptRunOptions } from '../runners/types/PromptRunOptions';
import { resolvePromptRunner } from './resolvePromptRunner';
import { runCodexPrompts } from './runCodexPrompts';
import { listCoderPrompts } from './listCoderPrompts';

jest.mock('./resolvePromptRunner', () => ({
    ...jest.requireActual('./resolvePromptRunner'),
    resolvePromptRunner: jest.fn(),
}));

/** Runs local fixture Git commands without a shell or global configuration changes. */
const EXECUTE_FILE = promisify(execFile);

/** Finite offline execution; the mock owns no installation, credentials, network or model calls. */
const RUN_OPTIONS: RunOptions = {
    dryRun: false, noUi: true, noCommit: true, gitChanges: 'ignore',
    waitForUser: false, waitAfterPrompt: 0, waitBetweenPrompts: 0, waitAfterError: 0,
    preserveLogs: true, normalizeLineEndings: false, allowCredits: false,
    autoMigrate: false, allowDestructiveAutoMigrate: false, autoPush: false, autoPull: false,
    agentName: 'openai-codex', priority: 0, limit: 1, isAskingQuestionsEnabled: false,
};

describe('project defaults through the real prompt queue and round', () => {
    let directory: string;
    let callerPath: string;
    let projectPath: string;
    let observed: PromptRunOptions[];

    /** Creates distinctive local inputs so an accidental read from another directory is detectable. */
    async function createProject(path: string, marker: string): Promise<void> {
        await mkdir(join(path, 'agents'), { recursive: true });
        await mkdir(join(path, 'prompts'));
        await writeFile(join(path, 'agents/developer.book'), `Developer\nFROM @Null\nRULE ${marker} Developer rule.\n`);
        await writeFile(join(path, 'agents/planner.book'), `Planner\nFROM @Null\nRULE ${marker} Planner rule.\n`);
        await writeFile(join(path, 'AGENTS.md'), `${marker} additional context.\n`);
        await writeFile(join(path, 'prompts/task.md'), '[ ]\n\nImplement the selected project task.\n');
    }

    beforeEach(async () => {
        directory = await realpath(await mkdtemp(join(tmpdir(), 'ptbk defaults integration ')));
        callerPath = join(directory, 'caller');
        projectPath = join(directory, 'repository', 'nested project');
        await createProject(callerPath, 'CALLER');
        await createProject(projectPath, 'SELECTED');
        await EXECUTE_FILE('git', ['init'], { cwd: join(directory, 'repository'), windowsHide: true });
        observed = [];
        jest.spyOn(console, 'info').mockImplementation(() => undefined);
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        jest.mocked(resolvePromptRunner).mockReturnValue({
            runner: {
                name: 'Mock harness',
                runPrompt: async (options) => {
                    observed.push(options);
                    expect(relative(options.projectPath, options.scriptPath)).not.toMatch(/^\.\./u);
                    await writeFile(join(options.projectPath, 'implemented.txt'), 'Implementation from mock harness.');
                    return { usage: UNCERTAIN_USAGE };
                },
            },
            actualRunnerModel: undefined,
            runnerMetadata: { runnerName: 'openai-codex' },
        });
    });

    afterEach(async () => {
        jest.restoreAllMocks();
        await rm(directory, { recursive: true, force: true });
    });

    it('observes identical persona and context for implicit and explicit defaults in one Node process', async () => {
        jest.spyOn(process, 'cwd').mockReturnValue(projectPath);
        await runCodexPrompts({ ...RUN_OPTIONS });
        await writeFile(join(projectPath, 'prompts/task.md'), '[ ]\n\nImplement the selected project task.\n');
        await runCodexPrompts({ ...RUN_OPTIONS, projectPath, agent: './agents/developer.book', context: './AGENTS.md' });
        expect(observed).toHaveLength(2);
        expect(observed[0]!.prompt).toBe(observed[1]!.prompt);
        expect(observed[0]!.prompt).toContain('SELECTED Developer rule.');
        expect(observed[0]!.prompt.match(/SELECTED additional context/g)).toHaveLength(1);
        expect(observed.every((options) => options.projectPath === projectPath)).toBe(true);
    });

    it('keeps two sequential project invocations independent and executes checks in the selected project', async () => {
        jest.spyOn(process, 'cwd').mockReturnValue(callerPath);
        await writeFile(join(projectPath, 'check.cjs'), "require('fs').writeFileSync('check-cwd.txt', process.cwd());\n");
        await runCodexPrompts({ ...RUN_OPTIONS, projectPath, checkCommand: 'node check.cjs' });
        expect(observed[0]!.prompt).not.toContain('CALLER');
        expect(await readFile(join(projectPath, 'check-cwd.txt'), 'utf-8')).toBe(projectPath);
        expect(await readFile(join(callerPath, 'prompts/task.md'), 'utf-8')).toMatch(/^\[ \]/u);
        expect(await readdir(callerPath)).not.toContain('implemented.txt');
        expect(await readdir(join(projectPath, 'prompts/traces'))).toContain('task.md');
        await runCodexPrompts({ ...RUN_OPTIONS, projectPath: callerPath, context: 'Explicit inline only', agent: 'agents/planner.book' });
        expect(observed).toHaveLength(2);
        expect(observed[1]!.projectPath).toBe(callerPath);
        expect(observed[1]!.prompt).toContain('CALLER Planner rule.');
        expect(observed[1]!.prompt).toContain('Explicit inline only');
        expect(observed[1]!.prompt).not.toContain('additional context');
        expect(observed[1]!.prompt).not.toContain('SELECTED');
    });

    it('keeps default agent targeting separate from an unfiltered listing', async () => {
        await writeFile(join(projectPath, 'prompts/task.md'), '[ ] use agent `planner`\n\nPlanner task.\n');
        await runCodexPrompts({ ...RUN_OPTIONS, projectPath });
        expect(observed).toHaveLength(0);
        const listing = await listCoderPrompts({ projectPath });
        expect(listing).toBe(1);
        expect(console.info).toHaveBeenCalledWith(expect.stringContaining('Planner task.'));
        await runCodexPrompts({ ...RUN_OPTIONS, projectPath, agent: 'agents/planner.book', context: '' });
        expect(observed).toHaveLength(1);
        expect(observed[0]!.prompt).toContain('SELECTED Planner rule.');
        expect(observed[0]!.prompt).not.toContain('additional context');
    });
});

// Note: [💞] Integration tests of shared defaults across the queue, harness, checks and artifacts.
