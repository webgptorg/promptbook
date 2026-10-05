import { Command } from 'commander';
import { execFile } from 'child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { runCoderFix } from '../../../../scripts/run-codex-prompts/main/runCoderFix';
import { runCodexPrompts } from '../../../../scripts/run-codex-prompts/main/runCodexPrompts';
import { withCoderWorkspaceLock } from '../../../../scripts/run-codex-prompts/common/withCoderWorkspaceLock';
import { $assertSufficientFreeDiskSpace } from '../common/disk-space/$assertSufficientFreeDiskSpace';
import { $ensureHarnessInstallations } from '../common/harness/$ensureHarnessInstallations';
import { $ensureCoderHarnessGitignoreRules } from './$ensureCoderHarnessGitignoreRules';
import { $initializeCoderFixCommand } from './fix';
import { $initializeCoderRunCommand } from './run';
import { $initializeCoderServerCommand } from './server';

jest.mock('../../../../scripts/run-codex-prompts/main/runCoderFix', () => ({
    ...jest.requireActual('../../../../scripts/run-codex-prompts/main/runCoderFix'),
    runCoderFix: jest.fn(),
}));
jest.mock('../common/disk-space/$assertSufficientFreeDiskSpace', () => ({ $assertSufficientFreeDiskSpace: jest.fn() }));
jest.mock('../common/harness/$ensureHarnessInstallations', () => ({ $ensureHarnessInstallations: jest.fn() }));
jest.mock('./$ensureCoderHarnessGitignoreRules', () => ({ $ensureCoderHarnessGitignoreRules: jest.fn() }));
jest.mock('../common/promptbook-cli/$ensurePromptbookCliInstallations', () => ({
    $ensurePromptbookCliInstallations: jest.fn(async () => false),
}));
jest.mock('../../../../scripts/run-codex-prompts/main/runCodexPrompts', () => ({ runCodexPrompts: jest.fn() }));

/** Git fixture initialization keeps executable/argument boundaries explicit. */
const EXECUTE_FILE = promisify(execFile);

describe('coder fix command contract', () => {
    let projectPath: string;
    let exitSpy: jest.SpyInstance;
    let currentDirectorySpy: jest.SpyInstance;

    /** Exercises the production Commander registration and option normalization. */
    const execute = async (argumentsList: string[]) => {
        const program = new Command().exitOverride();
        $initializeCoderFixCommand(program);
        await program.parseAsync(['fix', ...argumentsList], { from: 'user' });
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        projectPath = await mkdtemp(join(tmpdir(), 'coder fix flags '));
        await EXECUTE_FILE('git', ['init'], { cwd: projectPath });
        await writeFile(
            join(projectPath, 'package.json'),
            JSON.stringify({
                scripts: {
                    check: 'node check.cjs',
                    lint: 'node lint.cjs',
                    build: 'node build.cjs',
                    test: 'node test.cjs',
                },
            }),
        );
        await writeFile(join(projectPath, 'AGENTS.md'), 'DEFAULT_PROJECT_CONTEXT');
        exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
        currentDirectorySpy = jest.spyOn(process, 'cwd').mockReturnValue(projectPath);
        jest.mocked(runCoderFix).mockResolvedValue({ kind: 'passed-without-repair', isCheckPassed: true });
    });
    afterEach(async () => {
        exitSpy.mockRestore();
        currentDirectorySpy.mockRestore();
        await rm(projectPath, { recursive: true, force: true });
    });

    it('normalizes omitted check, Developer/path/context defaults, safety and explicit remote opt-ins', async () => {
        await execute(['--harness', 'openai-codex', '--no-questions', '--no-ui']);
        expect(runCoderFix).toHaveBeenCalledWith(
            expect.objectContaining({
                dryRun: false,
                checkCommand: 'npm run check',
                agent: undefined,
                workspace: expect.objectContaining({ projectPath: expect.stringContaining('coder fix flags') }),
                projectContext: expect.objectContaining({ context: 'DEFAULT_PROJECT_CONTEXT', agentBook: undefined }),
                isAskingQuestionsEnabled: false,
                noUi: true,
                autoPush: false,
                autoPull: false,
                noCommit: false,
            }),
        );
    });

    it.each([
        ['--check', 'npm run lint && npm run build && npm test'],
        ['--check', 'npm', 'run', 'lint', '&&', 'npm', 'run', 'build', '&&', 'npm', 'test'],
    ])('uses the shared shell command parsing for %j', async (...argumentsList) => {
        await execute(['--harness', 'openai-codex', ...argumentsList]);
        expect(runCoderFix).toHaveBeenCalledWith(
            expect.objectContaining({ checkCommand: 'npm run lint && npm run build && npm test' }),
        );
    });

    it('preserves explicit project, Book, context, harness, model, thinking and credit selections', async () => {
        const selectedProject = join(projectPath, 'nested project');
        await mkdir(join(selectedProject, 'agents'), { recursive: true });
        await writeFile(join(selectedProject, 'agents/custom.book'), 'Custom Developer\nFROM @Null\n');
        await writeFile(join(selectedProject, 'AGENTS.md'), 'IGNORED_DEFAULT_CONTEXT');
        await writeFile(join(selectedProject, 'replacement.md'), 'EXPLICIT_CONTEXT');
        await writeFile(
            join(selectedProject, 'package.json'),
            JSON.stringify({ scripts: { check: 'node check.cjs' } }),
        );
        await execute([
            '--path',
            'nested project',
            '--agent',
            './agents/custom.book',
            '--context',
            './replacement.md',
            '--harness',
            'github-copilot',
            '--model',
            'custom-model',
            '--thinking-level',
            'high',
            '--allow-credits',
            '--preserve-logs',
            '--no-commit',
            '--git-changes',
            'ignore',
            '--wait-after-error',
            '2s',
        ]);
        expect(runCoderFix).toHaveBeenCalledWith(
            expect.objectContaining({
                agentName: 'github-copilot',
                model: 'custom-model',
                thinkingLevel: 'high',
                allowCredits: true,
                agent: './agents/custom.book',
                projectContext: expect.objectContaining({
                    context: 'EXPLICIT_CONTEXT',
                    agentBook: expect.objectContaining({ agentName: 'Custom Developer' }),
                }),
                workspace: expect.objectContaining({ projectPath: expect.stringContaining('/nested project') }),
                preserveLogs: true,
                noCommit: true,
                gitChanges: 'ignore',
                waitAfterError: 2000,
            }),
        );
    });

    it('keeps help and previews side-effect free with no prompts, Book or harness', async () => {
        const before = await readdir(projectPath);
        const program = new Command();
        $initializeCoderFixCommand(program);
        const help = program.commands[0]!.helpInformation();
        expect(help).toContain('npm run check');
        for (const forbidden of [
            '--check-before',
            '--limit',
            '--priority',
            '--keep-alive',
            '--no-auto',
            '--auto-migrate',
        ]) {
            expect(help).not.toContain(forbidden);
        }
        await execute(['--dry-run', '--no-ui']);
        expect(runCoderFix).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true, agentName: undefined }));
        expect($assertSufficientFreeDiskSpace).not.toHaveBeenCalled();
        expect(await readdir(projectPath)).toEqual(before);
    });

    it('reports missing validation setup before Git initialization or any check/harness work', async () => {
        await rm(join(projectPath, '.git'), { recursive: true });
        await writeFile(join(projectPath, 'package.json'), '{}');
        const before = await readdir(projectPath);
        await execute(['--harness', 'openai-codex', '--no-questions']);
        expect(runCoderFix).not.toHaveBeenCalled();
        expect(exitSpy).toHaveBeenCalledWith(1);
        expect(await readdir(projectPath)).toEqual(before);
    });

    it('does not initialize Git in a noninteractive invocation or invent permission from no-questions', async () => {
        await rm(join(projectPath, '.git'), { recursive: true });
        await execute(['--harness', 'openai-codex', '--no-questions']);
        expect(runCoderFix).not.toHaveBeenCalled();
        await expect(readFile(join(projectPath, '.git/HEAD'))).rejects.toMatchObject({ code: 'ENOENT' });
    });

    it.each([
        ['run', $initializeCoderRunCommand],
        ['server', $initializeCoderServerCommand],
    ] as const)('prevents %s setup mutations while a check repair owns the project', async (name, register) => {
        await mkdir(join(projectPath, 'agents'));
        await writeFile(join(projectPath, 'agents/developer.book'), 'Developer\nFROM @Null\n');
        await withCoderWorkspaceLock(projectPath, async () => {
            const program = new Command().exitOverride();
            register(program);
            await program.parseAsync([name, '--harness', 'openai-codex', '--no-questions', '--no-ui'], {
                from: 'user',
            });
        });

        expect(exitSpy).toHaveBeenCalledWith(1);
        expect($ensureHarnessInstallations).not.toHaveBeenCalled();
        expect($ensureCoderHarnessGitignoreRules).not.toHaveBeenCalled();
        expect(runCodexPrompts).not.toHaveBeenCalled();
    });

    it.each([['--git-changes', 'continue'], ['--no-commit'], ['--check', ''], ['--agent', './missing.book']])(
        'rejects unsafe or invalid configuration %j before the check job',
        async (...argumentsList) => {
            await execute(['--harness', 'openai-codex', ...argumentsList]);
            expect(runCoderFix).not.toHaveBeenCalled();
            expect(exitSpy).toHaveBeenCalledWith(1);
        },
    );
});

// Note: [💞] Command parser regressions for coder fix.
