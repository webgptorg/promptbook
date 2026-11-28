// cspell:ignore gpgsign
import { execFile } from 'child_process';
import { chmod, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { promisify } from 'util';
import { UNCERTAIN_USAGE } from '../../../src/execution/utils/usage-constants';
import { $resolveWorkspaceRepository } from '../../../src/cli/cli-commands/common/workspaceRepository';
import type { RunOptions } from '../cli/RunOptions';
import {
    captureCoderCommitScope,
    continueCoderCommitScopeOwnership,
    type CoderCommitScope,
} from '../git/coderCommitScope';
import { CoderPhasePersistence } from '../git/CoderPhasePersistence';
import { CoderGitOperationError } from '../git/CoderGitOperationError';
import { ensureWorkingTreeClean } from '../git/ensureWorkingTreeClean';
import { runPromptRound } from '../main/runPromptRound';
import { runIsolatedPromptRound } from '../isolation/runIsolatedPromptRound';
import { parsePromptFile } from '../prompts/parsePromptFile';
import { buildScriptPath } from '../prompts/buildScriptPath';
import { buildScriptLogPath } from '../common/runGoScript/buildScriptLogPath';
import type { PromptSelection } from '../prompts/types/PromptSelection';
import type { PromptRunner } from '../runners/types/PromptRunner';
import { runCoderCheckRepair } from './runCoderCheckRepair';
import { runPromptWithCheckFeedback } from './runPromptWithCheckFeedback';
import { runCoderCheck } from './runCoderCheck';
import { CoderCheckExecutionError } from './CoderCheckExecutionError';
import { withCoderWorkspaceLock } from '../common/withCoderWorkspaceLock';

jest.mock('../git/agentGitIdentity', () => ({
    buildAgentGitEnv: () => undefined,
    buildAgentGitSigningFlag: () => undefined,
}));

/** Deterministic local Git fixtures do not use the user's hooks, signing identity or remotes. */
const EXECUTE_FILE = promisify(execFile);

describe('check change ownership and persistence', () => {
    let repositoryRoot: string;
    let projectPath: string;
    let selection: PromptSelection;
    let runHarness: jest.MockedFunction<PromptRunner['runPrompt']>;
    let startingHead: string;
    let temporaryRemote: string | undefined;

    /** Runs Git only in the fixture checkout; assertions retain binary/whitespace output boundaries. */
    const git = async (...argumentsList: string[]): Promise<string> =>
        (
            await EXECUTE_FILE('git', argumentsList, {
                cwd: repositoryRoot,
                env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' },
            })
        ).stdout;

    /** Creates the selected project and task inside either the repository root or a nested directory. */
    const initialize = async (isNested = false): Promise<void> => {
        repositoryRoot = await realpath(await mkdtemp(join(tmpdir(), 'coder-phase-')));
        projectPath = isNested ? join(repositoryRoot, 'apps', 'selected') : repositoryRoot;
        await mkdir(join(projectPath, 'prompts'), { recursive: true });
        await git('init', '--quiet', '--initial-branch=main');
        await git('config', 'user.name', 'Fixture Coder');
        await git('config', 'user.email', 'fixture@example.com');
        await git('config', 'commit.gpgsign', 'false');
        await writeFile(join(repositoryRoot, '.gitignore'), '.promptbook/\n');
        await writeFile(join(projectPath, 'value.txt'), 'base\n');
        await writeFile(join(projectPath, 'user.txt'), 'base user\n');
        await writeFile(join(projectPath, 'check.cjs'), "require('fs').writeFileSync('value.txt', 'checked\\n');\n");
        await writeFile(join(projectPath, 'prompts/task.md'), '[ ]\n\nImplement the fixture task.\n');
        await git('add', '--all');
        await git('commit', '--quiet', '-m', 'fixture');
        startingHead = (await git('rev-parse', 'HEAD')).trim();
        const file = parsePromptFile(
            join(projectPath, 'prompts/task.md'),
            await readFile(join(projectPath, 'prompts/task.md'), 'utf-8'),
        );
        selection = { file, section: file.sections[0]! };
        runHarness = jest.fn(async (options) => {
            expect(options.projectPath).toBe((await $resolveWorkspaceRepository(projectPath)).projectPath);
            await writeFile(join(projectPath, 'value.txt'), 'agent\n');
            return { usage: UNCERTAIN_USAGE };
        });
    };

    /** Executes an actual round with a local mock harness and the real selected check subprocess. */
    const runRound = async (
        task = selection,
        overrides: Partial<RunOptions> = {},
        scope?: CoderCommitScope,
        ownership: { ownershipScope?: CoderCommitScope; onScopeRetained?: (scope: CoderCommitScope) => void } = {},
    ): Promise<void> => {
        const workspace = await $resolveWorkspaceRepository(projectPath);
        await (overrides.isIsolated ? runIsolatedPromptRound : runPromptRound)({
            options: {
                workspace,
                projectPath: workspace.projectPath,
                dryRun: false,
                checkCommand: 'node check.cjs',
                preserveLogs: false,
                noUi: true,
                waitForUser: false,
                waitAfterPrompt: 0,
                waitBetweenPrompts: 0,
                waitAfterError: 0,
                noCommit: false,
                gitChanges: 'fail',
                normalizeLineEndings: true,
                allowCredits: false,
                autoMigrate: false,
                allowDestructiveAutoMigrate: false,
                autoPush: false,
                autoPull: false,
                agentName: 'openai-codex',
                model: 'fixture',
                priority: 0,
                ...overrides,
            },
            runner: { name: 'Local fixture', runPrompt: runHarness },
            runnerMetadata: { runnerName: 'Local fixture' },
            nextPrompt: task,
            promptLabel: 'fixture task',
            isRichUiEnabled: false,
            waitForRequestedPause: async () => undefined,
            commitScope: scope,
            ...ownership,
        });
    };

    /** Reads chronological commit identities/bodies so tests can inspect the corresponding trees. */
    const commits = async (): Promise<{ hash: string; message: string }[]> => {
        const hashes = (await git('rev-list', '--reverse', `${startingHead}..HEAD`)).trim().split('\n').filter(Boolean);
        return Promise.all(
            hashes.map(async (hash) => ({ hash, message: await git('show', '-s', '--format=%B', hash) })),
        );
    };

    /** Creates local committed Books so isolated execution can resolve context without installing or using a model. */
    const initializeBooks = async (): Promise<void> => {
        // Keep fixture bytes stable when the production Git commands load the host's checkout configuration.
        await git('config', 'core.autocrlf', 'false');
        await mkdir(join(projectPath, 'agents/.core'), { recursive: true });
        await writeFile(join(projectPath, 'agents/.core/adam.book'), 'Adam\nFROM @Null\nRULE Fixture foundation.\n');
        await writeFile(join(projectPath, 'agents/developer.book'), 'Developer\nRULE Fixture developer.\n');
        await git('add', '--', 'agents');
        await git('commit', '-m', 'fixture Books');
        startingHead = (await git('rev-parse', 'HEAD')).trim();
    };

    beforeEach(async () => {
        await initialize();
        jest.spyOn(console, 'info').mockImplementation(() => undefined);
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });
    afterEach(async () => {
        jest.restoreAllMocks();
        await rm(repositoryRoot, { recursive: true, force: true });
        if (temporaryRemote) await rm(temporaryRemote, { recursive: true, force: true });
        temporaryRemote = undefined;
    });

    it.each(['yes-and-fail', 'yes-and-fix'] as const)(
        'persists passing initial formatter changes before the queue clean guard (%s)',
        async (mode) => {
            const prepareRepair = jest.fn();
            const result = await runCoderCheckRepair({
                projectPath,
                mode,
                intent: 'run',
                checkCommand: 'node check.cjs',
                isCommitEnabled: true,
                isAutoPushEnabled: false,
                isWorkingTreeCleanRequired: true,
                prepareRepair,
            });
            expect(result).toMatchObject({ kind: 'passed-without-repair', isCheckPassed: true });
            const initialHistory = await commits();
            expect(initialHistory).toHaveLength(1);
            expect(initialHistory[0]!.message).toContain('Coder-Phase: pre-coding');
            expect(initialHistory[0]!.message).toContain('Coder-Check-Outcome: passed');
            await ensureWorkingTreeClean(repositoryRoot);
            await runRound();
            expect(runHarness).toHaveBeenCalledTimes(1);
            expect(await git('status', '--porcelain')).toBe('');
            expect(prepareRepair).not.toHaveBeenCalled();
        },
    );

    it.each(['yes-and-fail', 'yes-and-fix'] as const)(
        'persists a failing initial check without manufacturing a pass (%s)',
        async (mode) => {
            await writeFile(
                join(projectPath, 'check.cjs'),
                "const fs=require('fs'); fs.writeFileSync('generated.txt','check result'); process.exit(fs.readFileSync('value.txt','utf8')==='agent\\n'?0:7);\n",
            );
            await git('add', '--', 'check.cjs');
            await git('commit', '-m', 'failing check fixture');
            startingHead = (await git('rev-parse', 'HEAD')).trim();
            const prepareRepair = jest.fn(
                async () =>
                    async (task: PromptSelection, scope?: Awaited<ReturnType<typeof captureCoderCommitScope>>) =>
                        runRound(task, {}, scope),
            );
            const result = await runCoderCheckRepair({
                projectPath,
                mode,
                intent: 'run',
                checkCommand: 'node check.cjs',
                isCommitEnabled: true,
                isAutoPushEnabled: false,
                isWorkingTreeCleanRequired: true,
                prepareRepair,
            });
            const history = await commits();
            expect(history[0]!.message).toContain('Coder-Check-Outcome: failed');
            expect(await git('show', `${history[0]!.hash}:generated.txt`)).toBe('check result');
            expect(result.kind).toBe(mode === 'yes-and-fail' ? 'checks-failed' : 'repaired-and-verified');
            expect(result.isCheckPassed).toBe(mode === 'yes-and-fix');
            expect(runHarness).toHaveBeenCalledTimes(mode === 'yes-and-fix' ? 1 : 0);
        },
    );

    it('keeps same-line implementation and formatter transformations in different trees', async () => {
        await runRound();
        const history = await commits();
        const implementation = history.find((commit) => commit.message.includes('Coder-Phase: implementation'))!;
        const checks = history.find((commit) =>
            commit.message.startsWith('chore: Automatically commit changes made by checks'),
        )!;
        expect(await git('show', `${implementation.hash}:value.txt`)).toBe('agent\n');
        expect(await git('show', `${checks.hash}:value.txt`)).toBe('checked\n');
        expect(await git('diff', `${checks.hash}^`, checks.hash, '--', 'value.txt')).toContain('-agent\n+checked');
        expect(await readFile(join(projectPath, 'value.txt'), 'utf-8')).toBe('checked\n');
        expect(await git('show', 'HEAD:value.txt')).toBe('checked\n');
        expect(await git('status', '--porcelain')).toBe('');
        expect(selection.section.status).toBe('done');
        for (const commit of history.slice(0, -1))
            expect(await git('show', `${commit.hash}:prompts/task.md`)).not.toMatch(/^\[x\]/u);
    });

    it('captures creation, deletion, rename, binary bytes and executable modes, including a generated file changed by checks', async () => {
        await writeFile(join(projectPath, 'removed.txt'), 'remove');
        await writeFile(join(projectPath, 'renamed.txt'), 'rename');
        await writeFile(join(projectPath, 'executable.sh'), '#!/bin/sh\n');
        await git('add', '--all');
        await git('commit', '-m', 'shape fixture');
        startingHead = (await git('rev-parse', 'HEAD')).trim();
        await git('config', 'core.filemode', 'false');
        await writeFile(
            join(projectPath, 'check.cjs'),
            "const fs=require('fs');fs.writeFileSync('generated.txt','checked generated');fs.unlinkSync('removed.txt');fs.renameSync('renamed.txt','destination.txt');fs.writeFileSync('binary.bin',Buffer.from([0,255,1,2]));fs.chmodSync('executable.sh',0o755);fs.unlinkSync('temporary-generated.txt');\n",
        );
        await git('add', '--', 'check.cjs');
        await git('commit', '-m', 'check fixture');
        startingHead = (await git('rev-parse', 'HEAD')).trim();
        runHarness.mockImplementation(async () => {
            await writeFile(join(projectPath, 'value.txt'), 'agent\n');
            await writeFile(join(projectPath, 'generated.txt'), 'agent generated');
            await writeFile(join(projectPath, 'temporary-generated.txt'), 'agent temporary');
            return { usage: UNCERTAIN_USAGE };
        });
        await runRound();
        const history = await commits();
        const implementation = history.find((commit) => commit.message.includes('Coder-Phase: implementation'))!;
        const checks = history.find((commit) => commit.message.includes('Coder-Phase: post-implementation'))!;
        expect(await git('show', `${implementation.hash}:generated.txt`)).toBe('agent generated');
        expect(await git('show', `${implementation.hash}:temporary-generated.txt`)).toBe('agent temporary');
        expect(await git('show', `${checks.hash}:generated.txt`)).toBe('checked generated');
        expect(await git('ls-tree', checks.hash, '--', 'removed.txt', 'renamed.txt', 'temporary-generated.txt')).toBe(
            '',
        );
        expect(await git('show', `${checks.hash}:destination.txt`)).toBe('rename');
        // Windows chmod does not expose Unix execute bits; the snapshot retains the platform's actual mode.
        expect(await git('ls-tree', checks.hash, '--', 'executable.sh')).toMatch(
            process.platform === 'win32' ? /^100644/u : /^100755/u,
        );
        expect(await readFile(join(projectPath, 'binary.bin'))).toEqual(Buffer.from([0, 255, 1, 2]));
        expect(await git('status', '--porcelain')).toBe('');
    });

    it.each([false, true])(
        'skips empty check commits and retains a real revert to the baseline (revert: %s)',
        async (isRevert) => {
            await writeFile(
                join(projectPath, 'check.cjs'),
                isRevert ? "require('fs').writeFileSync('value.txt','base\\n');" : 'process.exit(0);',
            );
            await git('add', '--', 'check.cjs');
            await git('commit', '-m', 'check fixture');
            startingHead = (await git('rev-parse', 'HEAD')).trim();
            await runRound();
            const checkCommits = (await commits()).filter((commit) =>
                commit.message.includes('Coder-Phase: post-implementation'),
            );
            expect(checkCommits).toHaveLength(isRevert ? 1 : 0);
            expect(await git('show', 'HEAD:value.txt')).toBe(isRevert ? 'base\n' : 'agent\n');
            expect(await git('status', '--porcelain')).toBe('');
        },
    );

    it('keeps failed-check, agent-repair and recheck provenance in chronological history', async () => {
        await writeFile(
            join(projectPath, 'check.cjs'),
            "const fs=require('fs'); const isRepair=fs.readFileSync('value.txt','utf8')==='repair\\n'; fs.writeFileSync('value.txt',isRepair?'verified\\n':'failed formatted\\n'); process.exit(isRepair?0:7);",
        );
        await git('add', '--', 'check.cjs');
        await git('commit', '-m', 'retry fixture');
        startingHead = (await git('rev-parse', 'HEAD')).trim();
        runHarness.mockImplementation(async () => {
            await writeFile(
                join(projectPath, 'value.txt'),
                runHarness.mock.calls.length === 1 ? 'agent\n' : 'repair\n',
            );
            return { usage: UNCERTAIN_USAGE };
        });
        await runRound();
        expect(runHarness).toHaveBeenCalledTimes(2);
        const history = (await commits()).filter((commit) =>
            /Coder-Phase: (implementation|repair|post-implementation)/u.test(commit.message),
        );
        expect(await Promise.all(history.map((commit) => git('show', `${commit.hash}:value.txt`)))).toEqual([
            'agent\n',
            'failed formatted\n',
            'repair\n',
            'verified\n',
        ]);
        expect(history[1]!.message).toContain('Coder-Check-Outcome: failed');
        expect(history[2]!.message).toContain('Coder-Phase: repair');
        expect(selection.section.status).toBe('done');
        expect(await git('status', '--porcelain')).toBe('');
    });

    it('preserves unrelated staged and unstaged versions, and refuses ambiguous same-file edits', async () => {
        await writeFile(join(projectPath, 'user.txt'), 'staged user\n');
        await git('add', '--', 'user.txt');
        await writeFile(join(projectPath, 'user.txt'), 'unstaged user\n');
        const staged = await git('diff', '--cached');
        await runRound(undefined, { gitChanges: 'ignore' });
        expect(await git('diff', '--cached')).toBe(staged);
        expect(await readFile(join(projectPath, 'user.txt'), 'utf-8')).toBe('unstaged user\n');
        expect(await git('show', 'HEAD:user.txt')).toBe('base user\n');
        const head = (await git('rev-parse', 'HEAD')).trim();
        const scope = await captureCoderCommitScope(projectPath, { isContentSnapshotRequired: true });
        const persistence = new CoderPhasePersistence({ scope, isCommitEnabled: true, isAutoPushEnabled: false });
        await expect(
            persistence.mutate(() => writeFile(join(projectPath, 'user.txt'), 'check touched user\n')),
        ).rejects.toThrow(/pre-existing user work/u);
        expect((await git('rev-parse', 'HEAD')).trim()).toBe(head);
        expect(await git('diff', '--cached')).toBe(staged);
        expect(await readFile(join(projectPath, 'user.txt'), 'utf-8')).toBe('check touched user\n');
    });

    it('detects an unexpected editor between phase boundaries and retains both versions without guessing', async () => {
        const scope = await captureCoderCommitScope(projectPath, { isContentSnapshotRequired: true });
        const persistence = new CoderPhasePersistence({ scope, isCommitEnabled: true, isAutoPushEnabled: false });
        await persistence.mutate(() => writeFile(join(projectPath, 'value.txt'), 'agent\n'));
        await writeFile(join(projectPath, 'user.txt'), 'external edit\n');
        const check = jest.fn(async () => 'passed');
        await expect(persistence.mutate(check)).rejects.toThrow(/Unexpected concurrent/u);
        expect(check).not.toHaveBeenCalled();
        expect(await git('rev-parse', 'HEAD')).toBe(`${startingHead}\n`);
        expect(await readFile(join(projectPath, 'user.txt'), 'utf-8')).toBe('external edit\n');
    });

    it('preserves both live user versions when a real check transforms their file in its private view', async () => {
        await writeFile(
            join(projectPath, 'check.cjs'),
            "require('fs').writeFileSync('user.txt','formatter touched user\\n');",
        );
        await git('add', '--', 'check.cjs');
        await git('commit', '-m', 'overlap fixture');
        const head = await git('rev-parse', 'HEAD');
        await writeFile(join(projectPath, 'user.txt'), 'staged user\n');
        await git('add', '--', 'user.txt');
        await writeFile(join(projectPath, 'user.txt'), 'unstaged user\n');
        const staged = await git('diff', '--cached');
        const result = await runCoderCheckRepair({
            projectPath,
            mode: 'yes-and-fail',
            intent: 'run',
            checkCommand: 'node check.cjs',
            isCommitEnabled: true,
            isAutoPushEnabled: false,
            isWorkingTreeCleanRequired: false,
            prepareRepair: jest.fn(),
        });
        expect(result).toMatchObject({ kind: 'persistence-error', isCheckPassed: true });
        expect(String(result.error)).toContain('pre-existing user work');
        expect(await git('rev-parse', 'HEAD')).toBe(head);
        expect(await git('diff', '--cached')).toBe(staged);
        expect(await readFile(join(projectPath, 'user.txt'), 'utf-8')).toBe('unstaged user\n');
        expect(await git('worktree', 'list', '--porcelain')).toContain('check-views');
    });

    it('does not attribute an editor write during the check to the check command', async () => {
        const scope = await captureCoderCommitScope(projectPath, { isContentSnapshotRequired: true });
        const persistence = new CoderPhasePersistence({ scope, isCommitEnabled: true, isAutoPushEnabled: false });
        const executor = jest.fn(async (options: { projectPath: string }) => {
            expect(options.projectPath).not.toBe(projectPath);
            await writeFile(join(options.projectPath, 'value.txt'), 'private checked\n');
            await writeFile(join(projectPath, 'user.txt'), 'external editor\n');
            return 'check passed';
        });
        await expect(
            runCoderCheck({
                command: 'local fixture',
                projectPath,
                scriptPath: join(projectPath, '.promptbook/check.sh'),
                phase: 'pre-coding',
                persistence,
                executor,
            }),
        ).rejects.toMatchObject({ operation: 'record', checkOutcome: 'passed' });
        expect(await git('rev-parse', 'HEAD')).toBe(`${startingHead}\n`);
        expect(await readFile(join(projectPath, 'value.txt'), 'utf-8')).toBe('base\n');
        expect(await readFile(join(projectPath, 'user.txt'), 'utf-8')).toBe('external editor\n');
        const viewRoot = (await git('worktree', 'list', '--porcelain'))
            .split('\n')
            .find((line) => line.startsWith('worktree ') && line.includes('check-views'))!
            .slice('worktree '.length);
        expect(await readFile(join(viewRoot, 'value.txt'), 'utf-8')).toBe('private checked\n');
        expect(executor).toHaveBeenCalledTimes(1);
    });

    it('persists each failed transformation but stops after the existing three feedback attempts', async () => {
        await writeFile(
            join(projectPath, 'check.cjs'),
            "const fs=require('fs'); fs.writeFileSync('value.txt',fs.readFileSync('value.txt','utf8')+'failed check\\n'); process.exit(7);",
        );
        await git('add', '--', 'check.cjs');
        await git('commit', '-m', 'always failing fixture');
        startingHead = (await git('rev-parse', 'HEAD')).trim();
        runHarness.mockImplementation(async () => {
            await writeFile(join(projectPath, 'value.txt'), `agent attempt ${runHarness.mock.calls.length}\n`);
            return { usage: UNCERTAIN_USAGE };
        });
        await expect(runRound()).rejects.toThrow(/after 3 attempts/u);
        expect(runHarness).toHaveBeenCalledTimes(3);
        const history = (await commits()).filter((commit) =>
            /Coder-Phase: (implementation|repair|post-implementation)/u.test(commit.message),
        );
        expect(await Promise.all(history.map((commit) => git('show', `${commit.hash}:value.txt`)))).toEqual([
            'agent attempt 1\n',
            'agent attempt 1\nfailed check\n',
            'agent attempt 2\n',
            'agent attempt 2\nfailed check\n',
            'agent attempt 3\n',
            'agent attempt 3\nfailed check\n',
        ]);
        expect(selection.section.status).not.toBe('done');
        expect(await readFile(join(projectPath, 'prompts/task.md'), 'utf-8')).not.toMatch(/^\[x\]/u);
    });

    it('retains pending task status when only the completion commit fails', async () => {
        await writeFile(
            join(repositoryRoot, '.git/hooks/pre-commit'),
            '#!/bin/sh\ncase "$(git log -1 --format=%s)" in\n\'chore: Automatically commit changes made by checks\') exit 1;;\nesac\n',
        );
        await chmod(join(repositoryRoot, '.git/hooks/pre-commit'), 0o755);
        await expect(runRound()).rejects.toMatchObject({ operation: 'commit', checkOutcome: 'passed' });
        expect(runHarness).toHaveBeenCalledTimes(1);
        const history = await commits();
        expect(history.filter((commit) => commit.message.includes('Coder-Phase: implementation'))).toHaveLength(1);
        expect(history.filter((commit) => commit.message.includes('Coder-Phase: post-implementation'))).toHaveLength(1);
        expect(await git('show', 'HEAD:value.txt')).toBe('checked\n');
        expect(selection.section.status).not.toBe('done');
        expect(await readFile(join(projectPath, 'prompts/task.md'), 'utf-8')).not.toMatch(/^\[x\]/u);
    });

    it('reserves phase ownership before awaiting and rejects concurrent writers or persistence', async () => {
        const scope = await captureCoderCommitScope(projectPath, { isContentSnapshotRequired: true });
        const persistence = new CoderPhasePersistence({ scope, isCommitEnabled: true, isAutoPushEnabled: false });
        let releasePhase!: () => void;
        const phaseGate = new Promise<void>((resolve) => {
            releasePhase = resolve;
        });
        const execution = persistence.mutate(async () => {
            await phaseGate;
            await writeFile(join(projectPath, 'value.txt'), 'agent\n');
        });
        const otherWriter = jest.fn(async () => undefined);
        try {
            await expect(persistence.mutate(otherWriter)).rejects.toThrow(/Concurrent Coder/u);
            await expect(persistence.finalize()).rejects.toThrow(/Concurrent Coder/u);
            expect(otherWriter).not.toHaveBeenCalled();
        } finally {
            releasePhase();
            await execution;
        }
        expect(await git('rev-parse', 'HEAD')).toBe(`${startingHead}\n`);
    });

    it('allows sequential nested lifecycle services while rejecting overlapping sibling jobs', async () => {
        const workspace = await $resolveWorkspaceRepository(projectPath);
        await withCoderWorkspaceLock(workspace, async () => {
            let releaseJob!: () => void;
            const jobGate = new Promise<void>((resolve) => {
                releaseJob = resolve;
            });
            const execution = withCoderWorkspaceLock(workspace, () => jobGate, { isNestedOwnershipAllowed: true });
            try {
                await expect(
                    withCoderWorkspaceLock(workspace, async () => undefined, { isNestedOwnershipAllowed: true }),
                ).rejects.toThrow(/Concurrent nested/u);
            } finally {
                releaseJob();
                await execution;
            }
            await withCoderWorkspaceLock(
                workspace,
                async () => {
                    await withCoderWorkspaceLock(workspace, async () => undefined, { isNestedOwnershipAllowed: true });
                },
                { isNestedOwnershipAllowed: true },
            );
        });
    });

    it('persists writes from an execution error without converting it to a validation failure or retry', async () => {
        const scope = await captureCoderCommitScope(projectPath, { isContentSnapshotRequired: true });
        const persistence = new CoderPhasePersistence({ scope, isCommitEnabled: true, isAutoPushEnabled: false });
        const executor = jest.fn(async (options: { projectPath: string }) => {
            await writeFile(join(options.projectPath, 'value.txt'), 'partial check\n');
            throw new CoderCheckExecutionError('fixture command', 'Fixture abnormal process termination');
        });
        await expect(
            runCoderCheck({
                command: 'fixture command',
                projectPath,
                scriptPath: join(projectPath, '.promptbook/check.sh'),
                phase: 'pre-coding',
                persistence,
                executor,
            }),
        ).rejects.toBeInstanceOf(CoderCheckExecutionError);
        expect(executor).toHaveBeenCalledTimes(1);
        const history = await commits();
        expect(history).toHaveLength(1);
        expect(history[0]!.message).toContain('Coder-Check-Outcome: execution-error');
        expect(await git('show', 'HEAD:value.txt')).toBe('partial check\n');
    });

    it.each(['failure', 'transformation', 'signature'] as const)(
        'reports %s persistence without repeating the harness or marking done',
        async (kind) => {
            if (kind === 'signature') {
                await git('config', 'commit.gpgsign', 'true');
                await git('config', 'gpg.format', 'openpgp');
                await git('config', 'gpg.program', join(repositoryRoot, 'missing-signer'));
            } else {
                await writeFile(
                    join(repositoryRoot, '.git/hooks/pre-commit'),
                    kind === 'failure'
                        ? '#!/bin/sh\nexit 1\n'
                        : '#!/bin/sh\nprintf "hook changed\\n" > value.txt\ngit add -- value.txt\n',
                );
                await chmod(join(repositoryRoot, '.git/hooks/pre-commit'), 0o755);
            }
            await expect(runRound()).rejects.toBeInstanceOf(CoderGitOperationError);
            expect(runHarness).toHaveBeenCalledTimes(1);
            expect(selection.section.status).not.toBe('done');
            expect(await readFile(join(projectPath, 'value.txt'), 'utf-8')).toBe(
                kind === 'transformation' ? 'hook changed\n' : 'checked\n',
            );
            expect(await readFile(join(repositoryRoot, '.git/ptbk-coder/pending-persistence.json'), 'utf-8')).toContain(
                'expectedTree',
            );
        },
    );

    it('reports rejected push after local persistence without duplicate implementation/check commits', async () => {
        temporaryRemote = await mkdtemp(join(tmpdir(), 'coder-phase-remote-'));
        await EXECUTE_FILE('git', ['init', '--bare', temporaryRemote]);
        await writeFile(join(temporaryRemote, 'hooks/pre-receive'), '#!/bin/sh\nexit 1\n');
        await chmod(join(temporaryRemote, 'hooks/pre-receive'), 0o755);
        await git('remote', 'add', 'origin', temporaryRemote);
        // Surface the full cause if persistence fails before the intended remote rejection.
        const execution = runRound(undefined, { autoPush: true }).catch((error) => {
            if (error instanceof CoderGitOperationError && error.operation === 'push') return error;
            throw error;
        });
        await expect(execution).resolves.toMatchObject({ operation: 'push' });
        expect(runHarness).toHaveBeenCalledTimes(1);
        expect(
            (await commits()).filter((commit) => commit.message.includes('Coder-Phase: implementation')),
        ).toHaveLength(1);
        expect(
            (await commits()).filter((commit) => commit.message.includes('Coder-Phase: post-implementation')),
        ).toHaveLength(1);
        expect(await git('show', 'HEAD:value.txt')).toBe('checked\n');
    });

    it('uses the nested selected project for subprocesses and the enclosing root for Git trees', async () => {
        await rm(repositoryRoot, { recursive: true, force: true });
        await initialize(true);
        await runRound();
        const history = await commits();
        const implementation = history.find((commit) => commit.message.includes('Coder-Phase: implementation'))!;
        expect(await git('show', `${implementation.hash}:apps/selected/value.txt`)).toBe('agent\n');
        expect(await git('show', 'HEAD:apps/selected/value.txt')).toBe('checked\n');
        expect(await git('status', '--porcelain')).toBe('');
    });

    it.each(['success', 'concurrent-edit', 'merge-hook', 'merge-index-hook'] as const)(
        'preserves isolated phase history and retained work (%s)',
        async (kind) => {
            await initializeBooks();
            if (kind === 'success') {
                await writeFile(join(projectPath, 'user.txt'), 'staged user\n');
                await git('add', '--', 'user.txt');
                await writeFile(join(projectPath, 'user.txt'), 'unstaged user\n');
            }
            const staged = await git('diff', '--cached');
            runHarness.mockImplementation(async (options) => {
                expect(options.projectPath).not.toBe(projectPath);
                await writeFile(join(options.projectPath!, 'value.txt'), 'agent\n');
                if (kind === 'concurrent-edit') await writeFile(join(projectPath, 'user.txt'), 'external edit\n');
                return { usage: UNCERTAIN_USAGE };
            });
            if (kind === 'merge-hook' || kind === 'merge-index-hook') {
                await writeFile(
                    join(repositoryRoot, '.git/hooks/post-merge'),
                    kind === 'merge-hook'
                        ? '#!/bin/sh\nprintf "hook edit\\n" > value.txt\n'
                        : '#!/bin/sh\ngit update-index --assume-unchanged -- user.txt\n',
                );
                await chmod(join(repositoryRoot, '.git/hooks/post-merge'), 0o755);
            }
            const execution = runRound(undefined, { isIsolated: true, gitChanges: 'ignore' });
            if (kind === 'success') {
                await execution;
                const history = await commits();
                const implementation = history.find((commit) =>
                    commit.message.includes('Coder-Phase: implementation'),
                )!;
                const checks = history.find((commit) => commit.message.includes('Coder-Phase: post-implementation'))!;
                expect(await git('show', `${implementation.hash}:value.txt`)).toBe('agent\n');
                expect(await git('show', `${checks.hash}:value.txt`)).toBe('checked\n');
                expect(await git('show', 'HEAD:value.txt')).toBe('checked\n');
                expect(await git('diff', '--cached')).toBe(staged);
                expect(await readFile(join(projectPath, 'user.txt'), 'utf-8')).toBe('unstaged user\n');
                expect(await git('worktree', 'list', '--porcelain')).not.toContain('coder-isolation-worktrees');
                expect(await git('status', '--porcelain')).toBe('MM user.txt\n');
            } else {
                await expect(execution).rejects.toMatchObject({
                    operation: 'record',
                    message: expect.stringContaining(
                        kind === 'concurrent-edit' ? 'original checkout changed' : 'changed isolated integration',
                    ),
                });
                expect(await git('worktree', 'list', '--porcelain')).toContain('coder-isolation-worktrees');
                expect(selection.section.status).not.toBe('done');
                if (kind === 'merge-index-hook') expect(await git('ls-files', '-v', 'user.txt')).toBe('h user.txt\n');
                else
                    expect(
                        await readFile(
                            join(projectPath, kind === 'concurrent-edit' ? 'user.txt' : 'value.txt'),
                            'utf-8',
                        ),
                    ).toBe(kind === 'concurrent-edit' ? 'external edit\n' : 'hook edit\n');
            }
            expect(runHarness).toHaveBeenCalledTimes(1);
        },
    );

    it('retains formatter changes to the task body through completion and finalization', async () => {
        await writeFile(
            join(projectPath, 'check.cjs'),
            "const fs=require('fs'); fs.writeFileSync('value.txt','checked\\n'); const path='prompts/task.md'; fs.writeFileSync(path,fs.readFileSync(path,'utf8').replace('Implement the fixture task.','Formatted task description.'));\n",
        );
        await git('add', '--', 'check.cjs');
        await git('commit', '-m', 'task formatter fixture');
        startingHead = (await git('rev-parse', 'HEAD')).trim();
        await runRound();
        expect(await git('show', 'HEAD:prompts/task.md')).toContain('Formatted task description.');
        expect(await readFile(join(projectPath, 'prompts/task.md'), 'utf-8')).toContain('Formatted task description.');
        expect(await git('status', '--porcelain')).toBe('');
    });

    it.each([false, true])(
        'retains isolated execution artifacts at their supported location (ignored: %s)',
        async (isIgnored) => {
            if (!isIgnored) {
                await writeFile(join(repositoryRoot, '.gitignore'), '.promptbook/coder-isolation-worktrees/\n');
                await git('add', '--', '.gitignore');
                await git('commit', '-m', 'unignored isolated artifacts');
            }
            await initializeBooks();
            runHarness.mockImplementation(async (options) => {
                expect(options.projectPath).not.toBe(projectPath);
                await writeFile(join(options.projectPath!, 'value.txt'), 'agent\n');
                await mkdir(dirname(options.scriptPath), { recursive: true });
                await writeFile(options.scriptPath, '# fixture harness\n');
                await writeFile(options.logPath!, 'fixture transcript\n');
                return { usage: UNCERTAIN_USAGE };
            });
            await runRound(undefined, { isIsolated: true, preserveLogs: true });
            const logPath = buildScriptLogPath(buildScriptPath(selection.file, selection.section, projectPath));
            expect(await readFile(logPath, 'utf-8')).toContain('fixture transcript');
            expect(await git('status', '--porcelain')).toBe('');
            const history = await commits();
            const checks = history.find((commit) => commit.message.includes('Coder-Phase: post-implementation'))!;
            expect(await git('diff-tree', '--no-commit-id', '--name-only', '-r', checks.hash)).toBe('value.txt\n');
            expect(Boolean(await git('ls-files', '.promptbook'))).toBe(!isIgnored);
            expect(await git('worktree', 'list', '--porcelain')).not.toContain('coder-isolation-worktrees');
        },
    );

    it('retains ignored generator additions, deletions and binary output without staging them', async () => {
        await writeFile(join(repositoryRoot, '.gitignore'), '.promptbook/\nignored/\n');
        await writeFile(
            join(projectPath, 'check.cjs'),
            "const fs=require('fs');fs.mkdirSync('ignored',{recursive:true});fs.writeFileSync('ignored/generated.bin',Buffer.from([0,255,1]));fs.unlinkSync('ignored/old.txt');fs.writeFileSync('value.txt','checked\\n');",
        );
        await git('add', '--', '.gitignore', 'check.cjs');
        await git('commit', '-m', 'ignored generator fixture');
        await mkdir(join(projectPath, 'ignored'));
        await writeFile(join(projectPath, 'ignored/old.txt'), 'old ignored output');
        startingHead = (await git('rev-parse', 'HEAD')).trim();
        await runRound();
        expect(await readFile(join(projectPath, 'ignored/generated.bin'))).toEqual(Buffer.from([0, 255, 1]));
        await expect(readFile(join(projectPath, 'ignored/old.txt'))).rejects.toMatchObject({ code: 'ENOENT' });
        expect(await git('ls-files', 'ignored')).toBe('');
        expect(await git('status', '--porcelain')).toBe('');
    });

    it.each([false, true])(
        'retains ignored isolated generator output and concurrent original work (concurrent: %s)',
        async (isConcurrent) => {
            await writeFile(join(repositoryRoot, '.gitignore'), '.promptbook/\nignored/\n');
            await writeFile(
                join(projectPath, 'check.cjs'),
                "const fs=require('fs');fs.mkdirSync('ignored',{recursive:true});fs.writeFileSync('ignored/generated.bin',Buffer.from([0,255,1]));fs.writeFileSync('value.txt','checked\\n');",
            );
            await git('add', '--', '.gitignore', 'check.cjs');
            await git('commit', '-m', 'isolated ignored generator fixture');
            await initializeBooks();
            await mkdir(join(projectPath, 'ignored'));
            await writeFile(join(projectPath, 'ignored/original.txt'), 'original-only ignored work');
            runHarness.mockImplementation(async (options) => {
                await writeFile(join(options.projectPath!, 'value.txt'), 'agent\n');
                if (isConcurrent)
                    await writeFile(join(projectPath, 'ignored/generated.bin'), 'concurrent original work');
                return { usage: UNCERTAIN_USAGE };
            });
            const execution = runRound(undefined, { isIsolated: true });
            if (isConcurrent) {
                await expect(execution).rejects.toMatchObject({ operation: 'record' });
                expect(await readFile(join(projectPath, 'ignored/generated.bin'), 'utf-8')).toBe(
                    'concurrent original work',
                );
                expect(await git('worktree', 'list', '--porcelain')).toContain('coder-isolation-worktrees');
                expect(selection.section.status).not.toBe('done');
            } else {
                await execution;
                expect(await readFile(join(projectPath, 'ignored/generated.bin'))).toEqual(Buffer.from([0, 255, 1]));
                expect(await git('worktree', 'list', '--porcelain')).not.toContain('coder-isolation-worktrees');
                expect(selection.section.status).toBe('done');
            }
            expect(await readFile(join(projectPath, 'ignored/original.txt'), 'utf-8')).toBe(
                'original-only ignored work',
            );
            expect(await git('ls-files', 'ignored')).toBe('');
            expect(await git('status', '--porcelain')).toBe('');
            expect(runHarness).toHaveBeenCalledTimes(1);
        },
    );

    it('persists supported durable execution artifacts separately in a project without runtime ignores', async () => {
        await writeFile(join(repositoryRoot, '.gitignore'), '');
        await git('add', '--', '.gitignore');
        await git('commit', '-m', 'runtime artifacts fixture');
        startingHead = (await git('rev-parse', 'HEAD')).trim();
        await runRound(undefined, { preserveLogs: true });
        const history = await commits();
        const checks = history.find((commit) => commit.message.includes('Coder-Phase: post-implementation'))!;
        expect(await git('diff-tree', '--no-commit-id', '--name-only', '-r', checks.hash)).toBe('value.txt\n');
        expect(await git('ls-files', '.promptbook')).toContain('.check.sh');
        expect(await git('ls-files', '.promptbook')).toContain('.log');
        expect(await git('status', '--porcelain')).toBe('');
    });

    it('persists deletions of previously tracked runtime artifacts during default cleanup', async () => {
        await writeFile(join(repositoryRoot, '.gitignore'), '');
        const scriptPath = buildScriptPath(selection.file, selection.section, projectPath);
        const logPath = buildScriptLogPath(scriptPath);
        await mkdir(join(projectPath, '.promptbook', 'coder-prompts'), { recursive: true });
        await writeFile(logPath, 'previous tracked transcript\n');
        await writeFile(scriptPath.replace(/\.sh$/u, '.check.sh'), 'previous tracked check wrapper\n');
        await git('add', '--all');
        await git('commit', '-m', 'tracked artifact fixture');
        startingHead = (await git('rev-parse', 'HEAD')).trim();
        await runRound();
        expect(await git('ls-files', '.promptbook')).toBe('');
        expect(await git('status', '--porcelain')).toBe('');
        const history = await commits();
        const checks = history.find((commit) => commit.message.includes('Coder-Phase: post-implementation'))!;
        expect(await git('diff-tree', '--no-commit-id', '--name-only', '-r', checks.hash)).toBe('value.txt\n');
        expect(await git('show', '--format=', '--name-status', 'HEAD')).toContain('D\t.promptbook/');
    });

    it('protects pre-existing user edits to a known runtime artifact before any writer starts', async () => {
        await writeFile(join(repositoryRoot, '.gitignore'), '');
        const logPath = buildScriptLogPath(buildScriptPath(selection.file, selection.section, projectPath));
        await mkdir(join(projectPath, '.promptbook', 'coder-prompts'), { recursive: true });
        await writeFile(logPath, 'user transcript\n');
        await expect(runRound(undefined, { gitChanges: 'ignore' })).rejects.toThrow(/pre-existing user work/u);
        expect(runHarness).not.toHaveBeenCalled();
        expect(await readFile(logPath, 'utf-8')).toBe('user transcript\n');
        expect(await git('rev-parse', 'HEAD')).toBe(`${startingHead}\n`);
    });

    it('uses phase persistence and finishes clean when no project check was selected', async () => {
        runHarness.mockImplementation(async () => {
            await writeFile(join(projectPath, 'value.txt'), 'agent\r\n');
            const task = await readFile(selection.file.path, 'utf-8');
            await writeFile(selection.file.path, task.replace(/\n/gu, '\r\n'));
            return { usage: UNCERTAIN_USAGE };
        });
        await runRound(undefined, { checkCommand: undefined });
        expect(runHarness).toHaveBeenCalledTimes(1);
        const history = await commits();
        expect(history.some((commit) => commit.message.includes('Coder-Phase: post-implementation'))).toBe(false);
        const implementation = history.find((commit) => commit.message.includes('Coder-Phase: implementation'))!;
        expect(implementation.message).toContain('No project check command was selected.');
        expect(await git('show', `${implementation.hash}:value.txt`)).toBe('agent\r\n');
        expect(await git('show', 'HEAD:value.txt')).toBe('agent\n');
        expect(await git('show', `${implementation.hash}:prompts/task.md`)).not.toMatch(/^\[x\]/u);
        expect(await git('show', 'HEAD:prompts/task.md')).toMatch(/^\[x\]/u);
        expect(await readFile(selection.file.path, 'utf-8')).not.toContain('\r');
        expect(await git('status', '--porcelain')).toBe('');
    });

    it('retains the checked bytes and pending status when Git line-ending filters cannot represent a clean verified tree', async () => {
        await writeFile(join(projectPath, '.gitattributes'), '*.txt text eol=lf\n');
        await writeFile(join(projectPath, 'check.cjs'), "require('fs').writeFileSync('value.txt','checked\\r\\n');");
        await git('add', '--', '.gitattributes', 'check.cjs');
        await git('commit', '-m', 'line-ending filter fixture');
        startingHead = (await git('rev-parse', 'HEAD')).trim();
        await expect(runRound()).rejects.toMatchObject({ operation: 'record', checkOutcome: 'passed' });
        expect(await readFile(join(projectPath, 'value.txt'), 'utf-8')).toBe('checked\r\n');
        expect(await git('show', 'HEAD:value.txt')).toBe('checked\r\n');
        expect(await readFile(join(projectPath, 'prompts/task.md'), 'utf-8')).not.toMatch(/^\[x\]/u);
        expect(selection.section.status).not.toBe('done');
        expect(runHarness).toHaveBeenCalledTimes(1);
    });

    it('carries exact owned content through no-commit initial checking, repair and the queued task', async () => {
        await writeFile(
            join(projectPath, 'check.cjs'),
            "const fs=require('fs');const isPassed=fs.readFileSync('value.txt','utf8')==='agent\\n';fs.writeFileSync('value.txt',isPassed?'checked\\n':'failed formatted\\n');process.exit(isPassed?0:7);",
        );
        await git('add', '--', 'check.cjs');
        await git('commit', '-m', 'no-commit repair fixture');
        startingHead = (await git('rev-parse', 'HEAD')).trim();
        let ownershipScope: CoderCommitScope | undefined;
        const retainScope = (scope: CoderCommitScope): void => {
            ownershipScope = scope;
        };
        const result = await runCoderCheckRepair({
            projectPath,
            mode: 'yes-and-fix',
            intent: 'run',
            checkCommand: 'node check.cjs',
            isCommitEnabled: false,
            isAutoPushEnabled: false,
            isWorkingTreeCleanRequired: true,
            onScopeRetained: retainScope,
            prepareRepair: async () => async (task, scope) =>
                runRound(task, { noCommit: true, gitChanges: 'ignore' }, scope, { onScopeRetained: retainScope }),
        });
        expect(result).toMatchObject({ kind: 'repaired-and-verified', isCheckPassed: true });
        expect(ownershipScope?.repositorySnapshot).toBeDefined();
        await runRound(selection, { noCommit: true, gitChanges: 'ignore' }, undefined, {
            ownershipScope,
            onScopeRetained: retainScope,
        });
        expect(runHarness).toHaveBeenCalledTimes(2);
        expect(await git('rev-parse', 'HEAD')).toBe(`${startingHead}\n`);
        expect(await readFile(join(projectPath, 'value.txt'), 'utf-8')).toBe('checked\n');
        expect(await git('status', '--porcelain')).toContain('value.txt');
        expect(console.info).toHaveBeenCalledWith(expect.stringContaining('Leaving changes uncommitted'));
    });

    it('protects new staged and unstaged user edits between retained no-commit phases', async () => {
        let ownershipScope: CoderCommitScope | undefined;
        await runCoderCheckRepair({
            projectPath,
            mode: 'yes-and-fail',
            intent: 'run',
            checkCommand: 'node check.cjs',
            isCommitEnabled: false,
            isAutoPushEnabled: false,
            isWorkingTreeCleanRequired: true,
            onScopeRetained: (scope) => {
                ownershipScope = scope;
            },
            prepareRepair: jest.fn(),
        });
        await writeFile(
            join(projectPath, 'check.cjs'),
            "require('fs').writeFileSync('user.txt','private formatter\\n');",
        );
        await writeFile(join(projectPath, 'user.txt'), 'new staged user\n');
        await git('add', '--', 'user.txt');
        await writeFile(join(projectPath, 'user.txt'), 'new unstaged user\n');
        const staged = await git('diff', '--cached');
        await expect(
            runRound(selection, { noCommit: true, gitChanges: 'ignore' }, undefined, { ownershipScope }),
        ).rejects.toThrow(/pre-existing user work/u);
        expect(await git('diff', '--cached')).toBe(staged);
        expect(await readFile(join(projectPath, 'user.txt'), 'utf-8')).toBe('new unstaged user\n');
        expect(await git('rev-parse', 'HEAD')).toBe(`${startingHead}\n`);
    });

    it.each(['content', 'flags'] as const)(
        'protects newly staged user index %s in private checks between no-commit phases',
        async (change) => {
            const previous = await captureCoderCommitScope(projectPath, { isContentSnapshotRequired: true });
            await writeFile(join(projectPath, 'user.txt'), 'new staged user\n');
            await git('add', '--', 'user.txt');
            await writeFile(join(projectPath, 'user.txt'), 'new unstaged user\n');
            const staged = await git('diff', '--cached');
            const current = continueCoderCommitScopeOwnership(
                await captureCoderCommitScope(projectPath, { isContentSnapshotRequired: true }),
                previous,
            );
            const persistence = new CoderPhasePersistence({
                scope: current,
                isCommitEnabled: false,
                isAutoPushEnabled: false,
            });
            const originalBlob = (await git('rev-parse', 'HEAD:user.txt')).trim();
            await expect(
                runCoderCheck({
                    command: 'private staging fixture',
                    projectPath,
                    scriptPath: join(projectPath, '.promptbook/check.sh'),
                    phase: 'pre-coding',
                    persistence,
                    executor: async (options) => {
                        await EXECUTE_FILE(
                            'git',
                            change === 'content'
                                ? ['update-index', '--cacheinfo', `100644,${originalBlob},user.txt`]
                                : ['update-index', '--assume-unchanged', '--', 'user.txt'],
                            { cwd: options.projectPath },
                        );
                        return 'genuine passing check';
                    },
                }),
            ).rejects.toMatchObject({ operation: 'record', checkOutcome: 'passed' });
            expect(await git('diff', '--cached')).toBe(staged);
            expect(await readFile(join(projectPath, 'user.txt'), 'utf-8')).toBe('new unstaged user\n');
            expect(await git('ls-files', '-v', 'user.txt')).toBe('H user.txt\n');
            expect(await git('rev-parse', 'HEAD')).toBe(`${startingHead}\n`);
            const recoveryRoot = join(repositoryRoot, '.git/ptbk-coder/recovery');
            const recoveryId = (await readdir(recoveryRoot))[0]!;
            const phaseStart = (await readdir(join(recoveryRoot, recoveryId))).find((path) =>
                path.endsWith('-phase-start.json'),
            )!;
            const record = JSON.parse(await readFile(join(recoveryRoot, recoveryId, phaseStart), 'utf-8')) as {
                indexTree: string;
            };
            expect(await git('show', `${record.indexTree}:user.txt`)).toBe('new staged user\n');
            expect(await git('show-ref')).toContain(`${record.indexTree} refs/ptbk-coder/recovery/`);
        },
    );

    it('retains generated check objects from a private view on an unborn branch', async () => {
        await rm(join(repositoryRoot, '.git'), { recursive: true });
        await git('init', '--quiet', '--initial-branch=main');
        await git('config', 'user.name', 'Fixture Coder');
        await git('config', 'user.email', 'fixture@example.com');
        await git('config', 'commit.gpgsign', 'false');
        const result = await runCoderCheckRepair({
            projectPath,
            mode: 'yes-and-fail',
            intent: 'run',
            checkCommand: `node -e "const fs=require('fs');fs.writeFileSync('generated.txt','private staged generation');require('child_process').execFileSync('git',['add','--','generated.txt']);fs.writeFileSync('generated.txt','generated')"`,
            isCommitEnabled: false,
            isAutoPushEnabled: false,
            isWorkingTreeCleanRequired: false,
            prepareRepair: jest.fn(),
        });
        expect(result).toMatchObject({ kind: 'passed-without-repair', isCheckPassed: true });
        expect(await readFile(join(projectPath, 'generated.txt'), 'utf-8')).toBe('generated');
        expect(await git('show-ref')).toContain('refs/ptbk-coder/recovery/');
        const recoveryRoot = join(repositoryRoot, '.git/ptbk-coder/recovery');
        const recoveryId = (await readdir(recoveryRoot))[0]!;
        const privateRecordPath = (await readdir(join(recoveryRoot, recoveryId))).find((path) =>
            path.endsWith('-private-check-passed.json'),
        )!;
        const privateRecord = JSON.parse(
            await readFile(join(recoveryRoot, recoveryId, privateRecordPath), 'utf-8'),
        ) as { indexTree: string };
        expect(await git('show', `${privateRecord.indexTree}:generated.txt`)).toBe('private staged generation');
        await expect(git('rev-parse', '--verify', 'HEAD')).rejects.toThrow();
    });

    it('leases the real index throughout hooks while preserving both user staging versions', async () => {
        await writeFile(join(projectPath, 'user.txt'), 'staged user\n');
        await git('add', '--', 'user.txt');
        await writeFile(join(projectPath, 'user.txt'), 'unstaged user\n');
        const staged = await git('diff', '--cached');
        const hook = join(repositoryRoot, '.git', 'hooks', 'pre-commit');
        await writeFile(
            hook,
            `#!/bin/sh\nunset GIT_INDEX_FILE\ntest -f "$(git rev-parse --git-path index).lock" || exit 7\nif git add -- user.txt 2>/dev/null; then exit 7; fi\nexit 0\n`,
        );
        await chmod(hook, 0o755);
        await runRound(undefined, { gitChanges: 'ignore' });
        expect(await git('diff', '--cached')).toBe(staged);
        expect(await readFile(join(projectPath, 'user.txt'), 'utf-8')).toBe('unstaged user\n');
        expect(await git('show', 'HEAD:user.txt')).toBe('base user\n');
        expect(await git('status', '--porcelain')).toBe('MM user.txt\n');
    });

    it('leaves no-commit and interrupted work recoverable without automatic commits', async () => {
        await runRound(undefined, { noCommit: true, gitChanges: 'ignore' });
        expect(await git('rev-parse', 'HEAD')).toBe(`${startingHead}\n`);
        expect(await git('status', '--porcelain')).toContain('value.txt');
        const controller = new AbortController();
        const scope = await captureCoderCommitScope(projectPath, { isContentSnapshotRequired: true });
        const persistence = new CoderPhasePersistence({ scope, isCommitEnabled: false, isAutoPushEnabled: false });
        const runner: PromptRunner = {
            name: 'interrupt fixture',
            runPrompt: jest.fn(async () => {
                controller.abort(new Error('fixture interrupted'));
                throw controller.signal.reason;
            }),
        };
        await expect(
            runPromptWithCheckFeedback({
                runner,
                projectPath,
                prompt: 'fixture',
                promptLabel: 'fixture',
                scriptPath: join(projectPath, '.promptbook/interrupted.sh'),
                checkCommand: 'node check.cjs',
                persistence,
                signal: controller.signal,
            }),
        ).rejects.toThrow('fixture interrupted');
        expect(await git('rev-parse', 'HEAD')).toBe(`${startingHead}\n`);
    });
});
