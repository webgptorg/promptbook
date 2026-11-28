import { execFileSync } from 'child_process';
// cspell:ignore gpgsign
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { $commitCoderChanges, $startCoderGitSync } from '../../../../../scripts/run-codex-prompts/git/coderGitSync';
import { initializeCoderProjectConfiguration } from '../initializeCoderProjectConfiguration';
import { runPlanningSession } from './runPlanningSession';

/** Git synchronization explicitly requested by this authoring session. */
const GIT_SYNC = { isCommitEnabled: true, isAutoPullEnabled: false, isAutoPushEnabled: false };

describe('planning Git commit isolation', () => {
    let projectPath: string;
    beforeEach(async () => {
        projectPath = await mkdtemp(join(tmpdir(), 'ptbk planning git '));
        await initializeCoderProjectConfiguration(projectPath);
        await mkdir(join(projectPath, 'src'));
        await writeFile(join(projectPath, 'src/app.ts'), 'Original source');
        await writeFile(join(projectPath, 'prompts/existing.md'), '[ ]\n\n[✨🌳] Existing\n\nOriginal requirement.\n');
        git(['init']);
        git(['config', 'user.name', 'Planning fixture']);
        git(['config', 'user.email', 'planning@example.invalid']);
        git(['config', 'commit.gpgsign', 'false']);
        git(['add', '.']);
        git(['commit', '-m', 'Initial fixture']);
    });
    afterEach(async () => {
        await rm(projectPath, { recursive: true, force: true });
    });
    /** Runs only explicit test Git operations without a shell. */
    function git(argumentsList: string[]): string {
        return execFileSync('git', argumentsList, {
            cwd: projectPath,
            encoding: 'utf-8',
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
    }

    it('commits only session PRDs while preserving staged, unstaged and concurrent user changes', async () => {
        await writeFile(join(projectPath, 'src/app.ts'), 'User source edit');
        git(['add', 'src/app.ts']);
        const scope = await $startCoderGitSync({ projectPath, gitSync: GIT_SYNC });
        const messages = ['Author a feature', '/save', '/exit'];
        const saved = await runPlanningSession(
            {
                projectPath,
                agentName: 'openai-codex',
                allowCredits: false,
                noUi: true,
                preexistingChangedPaths: new Set(scope.snapshotBeforeOperation.changedFileHashes.keys()),
            },
            {
                signal: new AbortController().signal,
                readMessage: async () => messages.shift(),
                write: () => undefined,
            },
            async () =>
                JSON.stringify({
                    message: 'Ready for review.',
                    reads: [],
                    proposals: [
                        {
                            kind: 'create',
                            title: 'Session feature',
                            body: 'Acceptance criteria: the feature works.',
                            priority: 0,
                            isReady: true,
                        },
                    ],
                }),
        );
        await writeFile(join(projectPath, 'prompts/user.md'), 'A concurrent user draft');
        await $commitCoderChanges({
            gitSync: GIT_SYNC,
            commitScope: scope,
            relevantPaths: [...saved.keys()],
            commitMessage: 'Plan fixture feature',
        });
        expect(git(['show', '--format=', '--name-only', 'HEAD']).trim()).toBe([...saved.keys()][0]);
        expect(git(['diff', '--cached', '--name-only']).trim()).toBe('src/app.ts');
        expect(git(['status', '--short'])).toContain('prompts/user.md');
        expect(await readFile(join(projectPath, 'src/app.ts'), 'utf-8')).toBe('User source edit');
    });

    it('refuses to save over preexisting user changes during a committing session', async () => {
        const existing = await readFile(join(projectPath, 'prompts/existing.md'), 'utf-8');
        await writeFile(join(projectPath, 'prompts/existing.md'), existing + '\nUser context.');
        const scope = await $startCoderGitSync({ projectPath, gitSync: GIT_SYNC });
        const messages = ['Revise the requirement', '/save', '/exit'];
        const output: string[] = [];
        const saved = await runPlanningSession(
            {
                projectPath,
                agentName: 'openai-codex',
                allowCredits: false,
                noUi: true,
                preexistingChangedPaths: new Set(scope.snapshotBeforeOperation.changedFileHashes.keys()),
            },
            {
                signal: new AbortController().signal,
                readMessage: async () => messages.shift(),
                write: (message) => output.push(message),
            },
            async () =>
                JSON.stringify({
                    message: 'Revision.',
                    reads: [],
                    proposals: [
                        {
                            kind: 'edit',
                            path: 'prompts/existing.md',
                            find: 'Original requirement.',
                            replace: 'Revised requirement.',
                            isReady: true,
                        },
                    ],
                }),
        );
        expect(saved.size).toBe(0);
        expect(output.join('\n')).toContain('already had user changes');
        expect(await readFile(join(projectPath, 'prompts/existing.md'), 'utf-8')).toBe(existing + '\nUser context.');
    });

    it('refuses to include a concurrent user edit read before the first session save', async () => {
        const existing = await readFile(join(projectPath, 'prompts/existing.md'), 'utf-8');
        const scope = await $startCoderGitSync({ projectPath, gitSync: GIT_SYNC });
        const messages = ['Revise the requirement', '/save', '/exit'];
        const output: string[] = [];
        const saved = await runPlanningSession(
            {
                projectPath,
                agentName: 'openai-codex',
                allowCredits: false,
                noUi: true,
                preexistingChangedPaths: new Set(scope.snapshotBeforeOperation.changedFileHashes.keys()),
            },
            {
                signal: new AbortController().signal,
                readMessage: async () => messages.shift(),
                write: (message) => output.push(message),
            },
            async () => {
                await writeFile(join(projectPath, 'prompts/existing.md'), existing + '\nConcurrent user context.');
                return JSON.stringify({
                    message: 'Revision.',
                    reads: [],
                    proposals: [
                        {
                            kind: 'edit',
                            path: 'prompts/existing.md',
                            find: 'Original requirement.',
                            replace: 'Revised requirement.',
                            isReady: true,
                        },
                    ],
                });
            },
        );
        expect(saved.size).toBe(0);
        expect(output.join('\n')).toContain('concurrent user changes');
        expect(await readFile(join(projectPath, 'prompts/existing.md'), 'utf-8')).toBe(
            existing + '\nConcurrent user context.',
        );
    });
});

// Note: [💞] Ignore a discrepancy between file name and entity name.
