import { execFile } from 'child_process';
import { Command } from 'commander';
import { mkdir, mkdtemp, readdir, realpath, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { runCodexPrompts } from '../../../../scripts/run-codex-prompts/main/runCodexPrompts';
import { runCodexPromptsServer } from '../../../../scripts/run-codex-prompts/main/runCodexPromptsServer';
import { pingCoderHarness } from '../../../../scripts/run-codex-prompts/ping/pingCoderHarness';
import { verifyPrompts } from '../../../../scripts/verify-prompts/verify-prompts';
import { findRefactorCandidates } from '../../../../scripts/find-refactor-candidates/find-refactor-candidates';
import { loadPromptsModule } from '../../common/loadPromptsModule';
import { $ensureHarnessInstallations } from '../common/harness/$ensureHarnessInstallations';
import { $ensurePromptbookCliInstallations } from '../common/promptbook-cli/$ensurePromptbookCliInstallations';
import { $initializeCoderCommand } from '../coder';
import { $ensureCoderHarnessGitignoreRules } from './$ensureCoderHarnessGitignoreRules';
import { $initializeCoderInitCommand } from './init';
import { runPlanningSession } from './planning/runPlanningSession';

jest.mock('../../common/loadPromptsModule', () => ({ loadPromptsModule: jest.fn() }));
jest.mock('../common/harness/$ensureHarnessInstallations', () => ({ $ensureHarnessInstallations: jest.fn() }));
jest.mock('../common/promptbook-cli/$ensurePromptbookCliInstallations', () => ({
    $ensurePromptbookCliInstallations: jest.fn(),
}));
jest.mock('./$ensureCoderHarnessGitignoreRules', () => ({ $ensureCoderHarnessGitignoreRules: jest.fn() }));
jest.mock('../../../../scripts/run-codex-prompts/main/runCodexPrompts', () => ({ runCodexPrompts: jest.fn() }));
jest.mock('../../../../scripts/run-codex-prompts/main/runCodexPromptsServer', () => ({
    runCodexPromptsServer: jest.fn(),
}));
jest.mock('../../../../scripts/run-codex-prompts/ping/pingCoderHarness', () => ({ pingCoderHarness: jest.fn() }));
jest.mock('../../../../scripts/verify-prompts/verify-prompts', () => ({ verifyPrompts: jest.fn() }));
jest.mock('../../../../scripts/find-refactor-candidates/find-refactor-candidates', () => ({
    findRefactorCandidates: jest.fn(),
}));
jest.mock('./planning/runPlanningSession', () => ({ runPlanningSession: jest.fn() }));

/** Every registered mutating action, including execution paths with Git mutation disabled. */
const MUTATING_ARGUMENTS = [
    ['add', 'A reviewed feature'],
    ['plan', '--harness', 'openai-codex'],
    ['generate-boilerplates'],
    ['find-refactor-candidates'],
    ['run', '--harness', 'openai-codex'],
    ['run', '--harness', 'openai-codex', '--no-commit', '--git-changes', 'ignore'],
    ['ping', '--harness', 'openai-codex'],
    ['server', '--harness', 'openai-codex'],
    ['server', '--harness', 'openai-codex', '--no-commit', '--git-changes', 'ignore'],
    ['verify'],
];

/** Lightweight read-only workspace operations. */
const READ_ONLY_NAMES = ['list', 'find-unwritten', 'find-fresh-emoji-tags'];

/** Mocked startup boundaries that must not be reached after a failed preflight. */
const SIDE_EFFECT_BOUNDARIES = [
    $ensureHarnessInstallations,
    $ensurePromptbookCliInstallations,
    $ensureCoderHarnessGitignoreRules,
    runCodexPrompts,
    runCodexPromptsServer,
    pingCoderHarness,
    verifyPrompts,
    findRefactorCandidates,
    runPlanningSession,
];

describe('registered workspace actions', () => {
    let originalWorkingDirectory: string;
    let projectPath: string;
    let terminalDescriptor: PropertyDescriptor | undefined;
    const prompt = jest.fn();

    /** Registers all actions without loading any heavy runtime. */
    function createProgram(): Command {
        const program = new Command()
            .version('test-version')
            .exitOverride()
            .configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
        $initializeCoderCommand(program);
        $initializeCoderInitCommand(program);
        return program;
    }

    /** Invokes the same action through Commander that the installed CLI uses. */
    async function run(argumentsList: string[]): Promise<void> {
        await createProgram().parseAsync(['node', 'test', ...argumentsList]);
    }

    beforeEach(async () => {
        originalWorkingDirectory = process.cwd();
        projectPath = await realpath(await mkdtemp(join(tmpdir(), 'ptbk-preflight-action-')));
        process.chdir(projectPath);
        terminalDescriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
        Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: false });
        prompt.mockReset();
        (loadPromptsModule as jest.Mock).mockResolvedValue({ default: prompt });
        jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
        jest.spyOn(console, 'info').mockImplementation(() => undefined);
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        jest.clearAllMocks();
    });

    afterEach(async () => {
        process.chdir(originalWorkingDirectory);
        if (terminalDescriptor) Object.defineProperty(process.stdin, 'isTTY', terminalDescriptor);
        else delete (process.stdin as { isTTY?: boolean }).isTTY;
        jest.restoreAllMocks();
        await rm(projectPath, { recursive: true, force: true });
    });

    it.each(MUTATING_ARGUMENTS.map((argumentsList) => [argumentsList.join(' '), argumentsList]))(
        'guards %s before side effects in noninteractive and --no-questions modes',
        async (_label, argumentsList) => {
            for (const suffix of [[], ['--no-questions']]) {
                await run(['coder', ...(argumentsList as string[]), ...suffix]);
                expect(process.exit).toHaveBeenLastCalledWith(1);
                expect(console.error).toHaveBeenLastCalledWith(expect.stringContaining('No Git working tree'));
                expect(prompt).not.toHaveBeenCalled();
                for (const boundary of SIDE_EFFECT_BOUNDARIES) expect(boundary).not.toHaveBeenCalled();
                expect(await readdir(projectPath)).toEqual([]);
            }
        },
    );

    it('accepts once, initializes the requested project, and resumes the original authoring action', async () => {
        Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: true });
        prompt.mockResolvedValue({ isInitializingRepository: true });
        await run(['coder', 'add', 'A reviewed feature']);
        expect(prompt).toHaveBeenCalledTimes(1);
        expect(await readdir(projectPath)).toContain('.git');
        expect((await readdir(join(projectPath, 'prompts'))).some((path) => path.endsWith('.md'))).toBe(true);
        expect(process.exit).toHaveBeenLastCalledWith(0);
    });

    it.each(['run', 'server'])('resumes %s after one Git confirmation even when commits are disabled', async (name) => {
        await mkdir(join(projectPath, 'agents'));
        await writeFile(join(projectPath, 'agents/developer.book'), 'Project Developer\nPERSONA Implement tasks.\n');
        Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: true });
        prompt.mockResolvedValue({ isInitializingRepository: true });

        await run(['coder', name, '--harness', 'openai-codex', '--no-commit', '--git-changes', 'ignore']);

        expect(prompt).toHaveBeenCalledTimes(1);
        expect($ensureHarnessInstallations).toHaveBeenCalledTimes(1);
        expect(name === 'run' ? runCodexPrompts : runCodexPromptsServer).toHaveBeenCalledWith(
            expect.objectContaining({
                noCommit: true,
                workspace: expect.objectContaining({
                    projectPath,
                    repositoryRoot: projectPath,
                    repositoryStatus: 'initialized',
                }),
            }),
        );
        expect(process.exit).not.toHaveBeenCalledWith(1);
    });

    it.each([false, undefined])(
        'declining or cancelling execution leaves project and harnesses untouched: %s',
        async (answer) => {
            Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: true });
            prompt.mockResolvedValue(answer === undefined ? {} : { isInitializingRepository: answer });
            await run(['coder', 'run', '--harness', 'openai-codex']);
            expect(process.exit).toHaveBeenLastCalledWith(1);
            for (const boundary of SIDE_EFFECT_BOUNDARIES) expect(boundary).not.toHaveBeenCalled();
            expect(await readdir(projectPath)).toEqual([]);
        },
    );

    it.each(READ_ONLY_NAMES)('warns and retains useful %s output without project writes', async (name) => {
        await writeFile(join(projectPath, 'source.ts'), '// [✨]\n');
        await run(['coder', name, '--no-questions']);
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('No Git working tree'));
        expect(console.info).toHaveBeenCalled();
        expect(process.exit).toHaveBeenLastCalledWith(0);
        expect(await readdir(projectPath)).toEqual(['source.ts']);
        expect(prompt).not.toHaveBeenCalled();
    });

    it.each(['run', 'server'])('warns for %s --dry-run without any setup', async (name) => {
        await run(['coder', name, '--dry-run']);
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('No Git working tree'));
        expect(name === 'run' ? runCodexPrompts : runCodexPromptsServer).toHaveBeenCalledWith(
            expect.objectContaining({
                dryRun: true,
                workspace: expect.objectContaining({ repositoryStatus: 'missing', projectPath }),
            }),
        );
        expect($ensureHarnessInstallations).not.toHaveBeenCalled();
        expect($ensureCoderHarnessGitignoreRules).not.toHaveBeenCalled();
        expect(await readdir(projectPath)).toEqual([]);
    });

    it('keeps the action inventory exhaustive and supplies preflight help to every registration', () => {
        const coder = createProgram().commands.find((command) => command.name() === 'coder')!;
        const classifiedNames = new Set(['init', ...READ_ONLY_NAMES, ...MUTATING_ARGUMENTS.map(([name]) => name)]);
        expect(coder.commands.map((command) => command.name()).sort()).toEqual([...classifiedNames].sort());
        for (const command of coder.commands) {
            expect(command.helpInformation()).toContain('Usage:');
            expect(command.options.filter((option) => option.long === '--no-questions')).toHaveLength(1);
        }
    });

    it('keeps global and subcommand help, version, and usage errors available without Git', async () => {
        const originalPath = process.env.PATH;
        process.env.PATH = projectPath;
        try {
            const coderCommands = createProgram().commands.find((command) => command.name() === 'coder')!.commands;
            const requests = [
                ['--help'],
                ['--version'],
                ['coder', '--help'],
                ['init', '--help'],
                ['init', '--version'],
                ['coder'],
                ...coderCommands.map((command) => ['coder', command.name(), '--help']),
                ...coderCommands.map((command) => ['coder', command.name(), '--version']),
                ['coder', 'run'],
                ['coder', 'run', '--harness', 'wrong'],
                ['coder', 'run', '--harness', 'openai-codex', '--wait-after-error', 'wrong'],
                ['coder', 'server', '--port', 'invalid'],
                ['coder', 'generate-boilerplates', '--count', 'wrong'],
                ['coder', 'add', '--priority', '-1', 'Example'],
                ['init', '--auto-push'],
            ];
            for (const request of requests) {
                await run(request).catch((error) => expect(error.message).toBeTruthy());
                expect(console.error).not.toHaveBeenCalledWith(expect.stringContaining('Cannot inspect Git'));
                expect(console.error).not.toHaveBeenCalledWith(expect.stringContaining('No Git working tree'));
                expect(await readdir(projectPath)).toEqual([]);
            }
            for (const boundary of SIDE_EFFECT_BOUNDARIES) expect(boundary).not.toHaveBeenCalled();
            expect(prompt).not.toHaveBeenCalled();
        } finally {
            process.env.PATH = originalPath;
        }
    });

    it('continues to require verification answers with --no-questions in an existing repository', async () => {
        await promisify(execFile)('git', ['init'], { cwd: projectPath });
        await mkdir(join(projectPath, 'prompts'));
        await run(['coder', 'verify', '--no-questions']);
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('requires answers'));
        expect(verifyPrompts).not.toHaveBeenCalled();
        expect(await readdir(join(projectPath, 'prompts'))).toEqual([]);
    });
});

// Note: [💞] Ignore a discrepancy between file name and entity name
