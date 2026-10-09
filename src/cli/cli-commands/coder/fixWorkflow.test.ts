// cspell:ignore formatterx pathspecs
import { execFile } from 'child_process';
// cspell:ignore NOSYSTEM gpgsign
import { chmod, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { UNCERTAIN_USAGE } from '../../../execution/utils/usage-constants';
import type { RunOptions } from '../../../../scripts/run-codex-prompts/cli/RunOptions';
import { resolveCoderProjectContext } from '../../../../scripts/run-codex-prompts/common/resolveCoderProjectContext';
import { withCoderWorkspaceLock } from '../../../../scripts/run-codex-prompts/common/withCoderWorkspaceLock';
import { waitUntilWorldTimeDeadline } from '../../../../scripts/run-codex-prompts/common/waitUntilWorldTimeDeadline';
import { runCodexPrompts } from '../../../../scripts/run-codex-prompts/main/runCodexPrompts';
import { runCoderFix, type CoderFixOptions } from '../../../../scripts/run-codex-prompts/main/runCoderFix';
import { resolvePromptRunner } from '../../../../scripts/run-codex-prompts/main/resolvePromptRunner';
import { parsePromptFile } from '../../../../scripts/run-codex-prompts/prompts/parsePromptFile';
import type { PromptRunOptions } from '../../../../scripts/run-codex-prompts/runners/types/PromptRunOptions';
import { $ensureHarnessInstallations } from '../common/harness/$ensureHarnessInstallations';
import { $preflightWorkspaceRepository } from '../common/workspaceRepository';

jest.mock('../common/harness/$ensureHarnessInstallations', () => ({ $ensureHarnessInstallations: jest.fn() }));
jest.mock('./$ensureCoderHarnessGitignoreRules', () => ({ $ensureCoderHarnessGitignoreRules: jest.fn() }));
jest.mock('../../../../scripts/run-codex-prompts/main/resolvePromptRunner', () => ({
    ...jest.requireActual('../../../../scripts/run-codex-prompts/main/resolvePromptRunner'),
    resolvePromptRunner: jest.fn(),
}));

/** Executes fixture Git commands without shell interpolation or the user's signing configuration. */
const EXECUTE_FILE = promisify(execFile);
/** Ordinary PRDs exercise status, priority, routing and multi-section isolation. */
const ORDINARY_PROMPTS = {
    'high.md': '[ ] !!!!!!\n\nFORBIDDEN_HIGH: create forbidden.txt.\n',
    'targeted.md': '[ ] `Developer` !!!\n\nFORBIDDEN_TARGETED: create forbidden.txt.\n',
    'pending.md': '[ ]\n\nFORBIDDEN_PENDING: create forbidden.txt.\n',
    'failed.md': '[!] failed\n\nFORBIDDEN_FAILED\n',
    'interrupted.md': '[^] in progress\n\nFORBIDDEN_INTERRUPTED\n',
    'done.md': '[x] done\n\nFORBIDDEN_DONE\n',
    'draft.md': '[-]\n\nFORBIDDEN_DRAFT @@@\n',
    'multiple.md': '[x]\n\nFORBIDDEN_COMPLETED_SECTION\n\n[ ] !\n\nFORBIDDEN_READY_SECTION\n',
};

describe('finite fix and shared run check-repair workflow', () => {
    let projectPath: string;
    let options: CoderFixOptions;
    let runHarness: jest.Mock;
    let environment: NodeJS.ProcessEnv;

    /** Executes Git in only the selected temporary fixture. */
    const git = async (...argumentsList: string[]) =>
        (
            await EXECUTE_FILE('git', argumentsList, {
                cwd: projectPath,
                env: environment,
            })
        ).stdout.trim();

    /** Asserts every pre-existing PRD remains byte-for-byte unchanged. */
    const assertOrdinaryPromptsUnchanged = async () => {
        for (const [name, content] of Object.entries(ORDINARY_PROMPTS)) {
            expect(await readFile(join(projectPath, 'prompts', name), 'utf-8')).toBe(content);
        }
        await expect(readFile(join(projectPath, 'forbidden.txt'))).rejects.toMatchObject({ code: 'ENOENT' });
    };

    /** Reads the count written by the real shared check subprocess. */
    const checkCount = async () => Number(await readFile(join(projectPath, '.promptbook/check-count'), 'utf-8'));

    beforeEach(async () => {
        jest.clearAllMocks();
        environment = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
        projectPath = await mkdtemp(join(tmpdir(), 'coder fix workspace '));
        await git('init');
        await git('config', 'user.name', 'Fixture');
        await git('config', 'user.email', 'fixture@example.com');
        await git('config', 'commit.gpgsign', 'false');
        await mkdir(join(projectPath, 'agents'));
        await mkdir(join(projectPath, 'prompts'));
        await writeFile(join(projectPath, '.gitignore'), '.promptbook/\n');
        await writeFile(join(projectPath, 'agents/developer.book'), 'Developer\nFROM @Null\nRULE FIXTURE_DEVELOPER\n');
        await writeFile(join(projectPath, 'AGENTS.md'), 'FIXTURE_CONTEXT\n');
        await writeFile(join(projectPath, 'value.txt'), 'broken');
        await writeFile(join(projectPath, 'unrelated.txt'), 'original');
        await writeFile(join(projectPath, 'staged.txt'), 'original');
        await writeFile(join(projectPath, 'package.json'), JSON.stringify({ scripts: { check: 'node check.cjs' } }));
        await writeFile(
            join(projectPath, 'check.cjs'),
            `
            const fs = require('fs');
            fs.mkdirSync('.promptbook', { recursive: true });
            const count = Number(fs.existsSync('.promptbook/check-count') ? fs.readFileSync('.promptbook/check-count', 'utf8') : 0);
            fs.writeFileSync('.promptbook/check-count', String(count + 1));
            if (fs.readFileSync('value.txt', 'utf8') !== 'fixed') {
                console.error('Fixture lint/build/test defect. TOKEN=fixture-secret-value');
                process.exit(7);
            }
        `,
        );
        for (const [name, content] of Object.entries(ORDINARY_PROMPTS))
            await writeFile(join(projectPath, 'prompts', name), content);
        await git('add', '--all');
        await git('commit', '-m', 'fixture');
        const workspace = await $preflightWorkspaceRepository({
            projectDirectory: projectPath,
            policy: 'mutate',
            isAskingQuestionsEnabled: false,
        });
        options = {
            workspace,
            projectContext: await resolveCoderProjectContext({ projectPath, isDefaultAgentDeferred: true }),
            dryRun: false,
            checkCommand: 'npm run check',
            preserveLogs: false,
            noUi: true,
            noCommit: false,
            gitChanges: 'fail',
            normalizeLineEndings: true,
            allowCredits: false,
            autoPush: false,
            autoPull: false,
            waitAfterError: 0,
            agentName: 'openai-codex',
            isAskingQuestionsEnabled: false,
        };
        runHarness = jest.fn(async (runOptions: PromptRunOptions) => {
            expect(runOptions.projectPath).toBe(workspace.projectPath);
            expect(runOptions.prompt).toContain('Fix the existing project check failures only.');
            expect(runOptions.prompt).toContain('FIXTURE_DEVELOPER');
            expect(runOptions.prompt).toContain('FIXTURE_CONTEXT');
            expect(runOptions.prompt).not.toContain('FORBIDDEN_');
            expect(runOptions.prompt).not.toContain('remaining coding prompts');
            expect(runOptions.prompt).not.toContain('fixture-secret-value');
            await writeFile(join(projectPath, 'value.txt'), 'fixed');
            return { usage: UNCERTAIN_USAGE };
        });
        jest.mocked(resolvePromptRunner).mockImplementation(() => ({
            runner: { name: 'Mock repair harness', runPrompt: runHarness },
            actualRunnerModel: 'fixture-model',
            runnerMetadata: { runnerName: 'Mock', modelName: 'fixture-model' },
        }));
    });
    afterEach(async () => {
        await rm(projectPath, { recursive: true, force: true });
    });

    it('always checks a healthy project without preparing any harness or Book, creating a task or committing', async () => {
        await writeFile(join(projectPath, 'value.txt'), 'fixed');
        await rm(join(projectPath, 'agents'), { recursive: true });
        await git('add', '--all');
        await git('commit', '-m', 'healthy fixture without Book');
        const head = await git('rev-parse', 'HEAD');
        expect(await runCoderFix(options)).toMatchObject({ kind: 'passed-without-repair', isCheckPassed: true });
        expect(await checkCount()).toBe(1);
        expect(resolvePromptRunner).not.toHaveBeenCalled();
        expect($ensureHarnessInstallations).not.toHaveBeenCalled();
        expect(await git('rev-parse', 'HEAD')).toBe(head);
        expect((await readdir(join(projectPath, 'prompts'))).sort()).toEqual(Object.keys(ORDINARY_PROMPTS).sort());
        await assertOrdinaryPromptsUnchanged();
    });

    it('requires Git for direct execution before running a potentially mutating check', async () => {
        expect(
            await runCoderFix({
                ...options,
                workspace: { projectPath, repositoryStatus: 'missing' },
            }),
        ).toMatchObject({ kind: 'setup-error', isCheckPassed: false });
        expect(runHarness).not.toHaveBeenCalled();
        await expect(readFile(join(projectPath, '.promptbook/check-count'))).rejects.toMatchObject({ code: 'ENOENT' });
        await assertOrdinaryPromptsUnchanged();
    });

    it('executes one exact repair and commits verified files, preserving unrelated staged and unstaged work', async () => {
        await writeFile(join(projectPath, 'unrelated.txt'), 'user unstaged work');
        await writeFile(join(projectPath, 'staged.txt'), 'user staged work');
        await git('add', '--', 'staged.txt');
        const result = await runCoderFix({ ...options, gitChanges: 'ignore' });
        expect(result.kind).toBe('repaired-and-verified');
        expect(runHarness).toHaveBeenCalledTimes(1);
        expect(await checkCount()).toBe(2);
        const repair = await readFile(result.repairPrompt!.file.path, 'utf-8');
        expect(parsePromptFile(result.repairPrompt!.file.path, repair).sections[0]?.status).toBe('done');
        expect(repair).toContain('without weakening validation');
        expect(repair).not.toContain('Update the [AGENTS.md]');
        expect((await git('diff', '--name-only', 'HEAD~3', 'HEAD')).split('\n').sort()).toEqual(
            [
                `prompts/${result.repairPrompt!.file.name}`,
                `prompts/traces/${result.repairPrompt!.file.name}`,
                'value.txt',
            ].sort(),
        );
        expect(await git('diff', '--cached', '--name-only')).toBe('staged.txt');
        expect(await git('show', 'HEAD:unrelated.txt')).toBe('original');
        expect(await git('show', 'HEAD:staged.txt')).toBe('original');
        await assertOrdinaryPromptsUnchanged();
    });

    it('updates one repair across three real failed verifications, without outer retries or queue fallthrough', async () => {
        runHarness.mockImplementation(async () => ({ usage: UNCERTAIN_USAGE }));
        const result = await runCoderFix(options);
        expect(result.kind).toBe('checks-failed');
        expect(result.isCheckPassed).toBe(false);
        expect(runHarness).toHaveBeenCalledTimes(3);
        expect(await checkCount()).toBe(4);
        expect(
            (await readdir(join(projectPath, 'prompts'))).filter(
                (name) => name.includes('fix-the-existing') && name.endsWith('.md'),
            ),
        ).toHaveLength(1);
        expect(
            parsePromptFile(result.repairPrompt!.file.path, await readFile(result.repairPrompt!.file.path, 'utf-8'))
                .sections[0]?.status,
        ).toBe('failed');
        const history = await git('log', '--format=%B', 'HEAD');
        expect(history.match(/Coder-Phase: implementation/g)).toHaveLength(1);
        expect(history.match(/Coder-Phase: repair/g)).toHaveLength(2);
        expect(history).not.toContain('Coder-Phase: post-implementation');
        await assertOrdinaryPromptsUnchanged();
    });

    it('creates only the required repair artifact and trace when the prompts directory is absent', async () => {
        await rm(join(projectPath, 'prompts'), { recursive: true });
        await git('add', '--all');
        await git('commit', '-m', 'no backlog');
        const result = await runCoderFix(options);
        expect(result.kind).toBe('repaired-and-verified');
        expect((await readdir(join(projectPath, 'prompts'))).sort()).toEqual(
            [result.repairPrompt!.file.name, 'traces'].sort(),
        );
    });

    it('retains an unborn repository when a repair overlaps pre-existing untracked project content', async () => {
        await rm(join(projectPath, '.git'), { recursive: true });
        await git('init');
        await git('config', 'user.name', 'Fixture');
        await git('config', 'user.email', 'fixture@example.com');
        await git('config', 'commit.gpgsign', 'false');
        const result = await runCoderFix({ ...options, gitChanges: 'ignore' });
        expect(result.kind).toBe('persistence-error');
        expect(result.isCheckPassed).toBe(false);
        expect(String(result.error)).toContain('pre-existing user work');
        await expect(git('rev-parse', '--verify', 'HEAD')).rejects.toThrow();
        expect(await git('diff', '--cached', '--name-only')).toBe('');
        await assertOrdinaryPromptsUnchanged();
    });

    it('reports an unavailable check executable as setup without creating a repair or calling a harness', async () => {
        const result = await runCoderFix({ ...options, checkCommand: 'ptbk-fixture-check-that-does-not-exist' });
        expect(result.kind).toBe('setup-error');
        expect(String(result.error)).toContain('selected check command is unavailable');
        expect(result.repairPrompt).toBeUndefined();
        expect(runHarness).not.toHaveBeenCalled();
        await assertOrdinaryPromptsUnchanged();
    });

    it('reports missing repair setup after the real failure, without selecting any ordinary PRD', async () => {
        jest.mocked($ensureHarnessInstallations).mockRejectedValueOnce(
            new Error('Install the unavailable fixture harness'),
        );
        const result = await runCoderFix(options);
        expect(result.kind).toBe('setup-error');
        expect(result.repairPrompt).toBeDefined();
        expect(await checkCount()).toBe(1);
        expect(runHarness).not.toHaveBeenCalled();
        await assertOrdinaryPromptsUnchanged();
    });

    it('keeps an interrupted repair in progress and never executes the backlog during cleanup', async () => {
        const controller = new AbortController();
        runHarness.mockImplementation(async () => {
            controller.abort(new Error('Fixture cancelled'));
            throw controller.signal.reason;
        });
        const result = await runCoderFix({ ...options, signal: controller.signal });
        expect(result.kind).toBe('interrupted');
        expect(runHarness).toHaveBeenCalledTimes(1);
        expect(await checkCount()).toBe(1);
        expect(
            parsePromptFile(result.repairPrompt!.file.path, await readFile(result.repairPrompt!.file.path, 'utf-8'))
                .sections[0]?.status,
        ).toBe('in-progress');
        await assertOrdinaryPromptsUnchanged();
    });

    it('respects a live workspace owner and releases its lease after the finite job', async () => {
        await withCoderWorkspaceLock(options.workspace, async () => {
            expect(await runCoderFix(options)).toMatchObject({ kind: 'setup-error' });
            expect(runHarness).not.toHaveBeenCalled();
            await expect(readFile(join(projectPath, '.promptbook/check-count'))).rejects.toMatchObject({
                code: 'ENOENT',
            });
        });
        expect((await runCoderFix(options)).kind).toBe('repaired-and-verified');
        await assertOrdinaryPromptsUnchanged();
    });

    it('stops at a failed commit without paying for another repair or creating another PRD', async () => {
        await writeFile(join(projectPath, '.git/hooks/pre-commit'), '#!/bin/sh\nexit 1\n');
        await chmod(join(projectPath, '.git/hooks/pre-commit'), 0o755);
        const result = await runCoderFix(options);
        expect(result).toMatchObject({ kind: 'persistence-error', isCheckPassed: true });
        expect(runHarness).toHaveBeenCalledTimes(1);
        expect(await checkCount()).toBe(2);
        expect(await git('rev-list', '--count', 'HEAD')).toBe('1');
        await assertOrdinaryPromptsUnchanged();
    });

    it('cancels an owned commit hook after verification without another repair attempt or commit', async () => {
        const controller = new AbortController();
        const hookReadyPath = join(projectPath, '.promptbook/commit-hook-ready');
        await writeFile(
            join(projectPath, '.git/hooks/repair-wait.cjs'),
            "require('fs').writeFileSync('.promptbook/commit-hook-ready', String(process.pid)); setInterval(() => {}, 1000);",
        );
        await writeFile(join(projectPath, '.git/hooks/pre-commit'), '#!/bin/sh\nnode .git/hooks/repair-wait.cjs\n');
        await chmod(join(projectPath, '.git/hooks/pre-commit'), 0o755);

        const execution = runCoderFix({ ...options, signal: controller.signal });
        try {
            await waitUntilWorldTimeDeadline({
                // Private checks and phase preparation run before this hook. Give that real Git work its
                // normal test budget, leaving one minute for cancellation assertions and fixture cleanup.
                deadlineTimeMs: Date.now() + 4 * 60_000,
                pollIntervalMs: 100,
                shouldStopWaiting: () => controller.signal.aborted,
                onTick: async () => {
                    const marker = await readFile(hookReadyPath).catch(() => undefined);
                    if (marker) controller.abort(new Error('Fixture commit hook cancelled'));
                },
            });
        } finally {
            if (!controller.signal.aborted) controller.abort(new Error('Fixture commit hook never started'));
        }
        const result = await execution;
        expect(result).toMatchObject({ kind: 'interrupted', isCheckPassed: true });
        expect(String(result.error)).toContain('Fixture commit hook cancelled');
        expect(runHarness).toHaveBeenCalledTimes(1);
        expect(await checkCount()).toBe(2);
        expect(await git('rev-list', '--count', 'HEAD')).toBe('1');
        await expect(
            readFile(join(projectPath, '.promptbook/ptbk-coder/ptbk-coder-workspace.lock')),
        ).rejects.toMatchObject({
            code: 'ENOENT',
        });
        await assertOrdinaryPromptsUnchanged();
    });

    it.each([false, true])(
        'uses explicit push opt-in and separates remote rejection from validation (rejected: %s)',
        async (isRejected) => {
            const remotePath = await mkdtemp(join(tmpdir(), 'coder fix bare remote '));
            try {
                await EXECUTE_FILE('git', ['init', '--bare', remotePath], { env: environment });
                if (isRejected) {
                    await writeFile(join(remotePath, 'hooks/pre-receive'), '#!/bin/sh\nexit 1\n');
                    await chmod(join(remotePath, 'hooks/pre-receive'), 0o755);
                }
                await git('remote', 'add', 'origin', remotePath);
                const result = await runCoderFix({ ...options, autoPush: true });
                expect(result.kind).toBe(isRejected ? 'persistence-error' : 'repaired-and-verified');
                expect(result.isCheckPassed).toBe(true);
                expect(runHarness).toHaveBeenCalledTimes(1);
                expect(await git('rev-list', '--count', 'HEAD')).toBe('4');
                if (isRejected) expect(String(result.error)).toContain('local commit exists');
                else
                    expect(
                        (
                            await EXECUTE_FILE('git', ['rev-parse', 'HEAD'], { cwd: remotePath, env: environment })
                        ).stdout.trim(),
                    ).toBe(await git('rev-parse', 'HEAD'));
                await assertOrdinaryPromptsUnchanged();
            } finally {
                await rm(remotePath, { recursive: true, force: true });
            }
        },
    );

    it('commits only formatter-produced changes after a passing check and launches no harness', async () => {
        const command = `node -e "require('fs').writeFileSync('value.txt', 'fixed')"`;
        await writeFile(join(projectPath, 'unrelated.txt'), 'user change');
        const result = await runCoderFix({ ...options, checkCommand: command, gitChanges: 'ignore' });
        expect(result.kind).toBe('passed-without-repair');
        expect(resolvePromptRunner).not.toHaveBeenCalled();
        expect(await git('show', '--format=', '--name-only', 'HEAD')).toBe('value.txt');
        await assertOrdinaryPromptsUnchanged();
    });

    it.each([
        'formatter$HOME.txt',
        "formatter 'quoted'.txt",
        ' formatter-žluťoučký.txt',
        'formatter[xy].txt',
        // Windows disallows double quotes, asterisks and colons in filenames. Unix also exercises these
        // literal pathspecs; both platforms retain dollar signs, quoting, whitespace, Unicode and brackets.
        ...(process.platform === 'win32'
            ? []
            : ['formatter "quoted".txt', 'formatter*.txt', ':(exclude)formatter.txt']),
    ])('preserves literal characters in the formatter-produced filename %s', async (formattedPath) => {
        await writeFile(
            join(projectPath, 'format.cjs'),
            `require('fs').writeFileSync(${JSON.stringify(formattedPath)}, 'formatted');`,
        );
        await git('add', '--', 'format.cjs');
        await git('commit', '-m', 'formatter fixture');
        await writeFile(join(projectPath, 'formatterx.txt'), 'unrelated staged work');
        await git('add', '--', 'formatterx.txt');
        expect(await runCoderFix({ ...options, checkCommand: 'node format.cjs', gitChanges: 'ignore' })).toMatchObject({
            kind: 'passed-without-repair',
            isCheckPassed: true,
        });
        expect(await git('--literal-pathspecs', 'ls-files', '--', formattedPath)).not.toBe('');
        expect(await git('show', `HEAD:${formattedPath}`)).toBe('formatted');
        expect(await git('diff', '--cached', '--name-only')).toBe('formatterx.txt');
        expect(runHarness).not.toHaveBeenCalled();
        await assertOrdinaryPromptsUnchanged();
    });

    it('does not absorb unrelated staged work when all repair changes are ignored by Git', async () => {
        await git('rm', '--cached', '--', 'value.txt');
        await git('commit', '-m', 'untracked implementation fixture');
        await writeFile(join(projectPath, '.git/info/exclude'), 'value.txt\nprompts/\n');
        await writeFile(join(projectPath, 'staged.txt'), 'unrelated staged work');
        await git('add', '--', 'staged.txt');
        const head = await git('rev-parse', 'HEAD');

        expect(await runCoderFix({ ...options, gitChanges: 'ignore' })).toMatchObject({
            kind: 'repaired-and-verified',
            isCheckPassed: true,
        });
        expect(await git('rev-parse', 'HEAD')).toBe(head);
        expect(await git('diff', '--cached', '--name-only')).toBe('staged.txt');
        await assertOrdinaryPromptsUnchanged();
    });

    it.each([true, false])(
        'verifies the persisted line endings rather than a pre-normalization pass (normalize: %s)',
        async (isNormalizationEnabled) => {
            // Production Git reads host defaults, unlike the fixture's setup commands. Keep checkout bytes
            // deterministic so this case measures the requested normalization, including on Windows.
            await git('config', 'core.autocrlf', 'false');
            const checkContent = await readFile(join(projectPath, 'check.cjs'), 'utf-8');
            await writeFile(join(projectPath, 'check.cjs'), checkContent.replace("!== 'fixed'", "!== 'fixed\\r\\n'"));
            await git('add', '--', 'check.cjs');
            await git('commit', '-m', 'line ending validation fixture');
            runHarness.mockImplementation(async () => {
                await writeFile(join(projectPath, 'value.txt'), 'fixed\r\n');
                return { usage: UNCERTAIN_USAGE };
            });

            const result = await runCoderFix({ ...options, normalizeLineEndings: isNormalizationEnabled });
            expect(result).toMatchObject({
                kind: isNormalizationEnabled ? 'checks-failed' : 'repaired-and-verified',
                isCheckPassed: !isNormalizationEnabled,
            });
            expect(runHarness).toHaveBeenCalledTimes(isNormalizationEnabled ? 3 : 1);
            expect(await checkCount()).toBe(isNormalizationEnabled ? 4 : 2);
            const history = await git('log', '--format=%B', 'HEAD');
            expect(history.match(/Coder-Phase: implementation/g)).toHaveLength(1);
            expect(history.match(/Coder-Phase: repair/g) ?? []).toHaveLength(isNormalizationEnabled ? 2 : 0);
            expect(await readFile(join(projectPath, 'value.txt'), 'utf-8')).toBe(
                isNormalizationEnabled ? 'fixed\n' : 'fixed\r\n',
            );
            await assertOrdinaryPromptsUnchanged();
        },
    );

    it('leaves a verified repair uncommitted under the shared no-commit policy', async () => {
        const result = await runCoderFix({ ...options, noCommit: true, gitChanges: 'ignore' });
        expect(result.kind).toBe('repaired-and-verified');
        expect(await git('rev-list', '--count', 'HEAD')).toBe('1');
        expect(await readFile(join(projectPath, 'value.txt'), 'utf-8')).toBe('fixed');
        await assertOrdinaryPromptsUnchanged();
    });

    it('excludes temporary check scripts from commits even when the project has no Promptbook ignore rule', async () => {
        await rm(join(projectPath, '.gitignore'));
        await git('add', '--all');
        await git('commit', '-m', 'no tool ignore rule');
        // The count is a fixture-only diagnostic; keep it out of the commit independently of tool artifacts.
        await writeFile(join(projectPath, '.git/info/exclude'), '.promptbook/check-count\n');
        const result = await runCoderFix(options);
        expect(result.kind).toBe('repaired-and-verified');
        expect(await git('status', '--porcelain')).toBe('');
        expect(await git('show', '--format=', '--name-only', 'HEAD')).not.toContain('.promptbook');
        await assertOrdinaryPromptsUnchanged();
    });

    it('exercises the same repair service while run may continue to its selected ordinary task', async () => {
        await rm(join(projectPath, 'prompts'), { recursive: true });
        await mkdir(join(projectPath, 'prompts'));
        await writeFile(join(projectPath, 'prompts/ordinary.md'), '[ ]\n\nORDINARY_IMPLEMENTATION\n');
        await git('add', '--all');
        await git('commit', '-m', 'run continuation fixture');
        runHarness.mockImplementation(async (runOptions: PromptRunOptions) => {
            if (runOptions.prompt.includes('ORDINARY_IMPLEMENTATION'))
                await writeFile(join(projectPath, 'ordinary.txt'), 'ordinary executed');
            else {
                expect(runOptions.prompt).toContain('remaining coding prompts');
                await writeFile(join(projectPath, 'value.txt'), 'fixed');
            }
            return { usage: UNCERTAIN_USAGE };
        });
        const runOptions: RunOptions = {
            ...options,
            projectPath,
            waitForUser: false,
            checkBefore: 'yes-and-fix',
            autoMigrate: false,
            allowDestructiveAutoMigrate: false,
            priority: 0,
            waitAfterPrompt: 0,
            waitBetweenPrompts: 0,
            limit: 1,
        };
        await runCodexPrompts(runOptions);
        expect(runHarness).toHaveBeenCalledTimes(2);
        expect(await readFile(join(projectPath, 'ordinary.txt'), 'utf-8')).toBe('ordinary executed');
        expect(await checkCount()).toBe(3);
    });

    it('shares the real initial check but run check-and-fail stops before repair or ordinary implementation', async () => {
        const runOptions: RunOptions = {
            ...options,
            projectPath,
            waitForUser: false,
            checkBefore: 'yes-and-fail',
            autoMigrate: false,
            allowDestructiveAutoMigrate: false,
            priority: 0,
            waitAfterPrompt: 0,
            waitBetweenPrompts: 0,
        };
        await expect(runCodexPrompts(runOptions)).rejects.toThrow('Pre-coding check command');
        expect(runHarness).not.toHaveBeenCalled();
        expect(await checkCount()).toBe(1);
        expect((await readdir(join(projectPath, 'prompts'))).sort()).toEqual(Object.keys(ORDINARY_PROMPTS).sort());
        await assertOrdinaryPromptsUnchanged();
    });
});

// Note: [💞] Integration tests for the shared Coder fix workflow.
