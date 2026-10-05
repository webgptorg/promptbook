// cspell:ignore NOSYSTEM gpgsign
import { execFile } from 'child_process';
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join, relative } from 'path';
import { promisify } from 'util';
import { $resolveWorkspaceRepository } from '../../../src/cli/cli-commands/common/workspaceRepository';
import type { RunOptions } from '../cli/RunOptions';
import { runPromptRound } from '../main/runPromptRound';
import { parsePromptFile } from '../prompts/parsePromptFile';
import { runIsolatedPromptRound } from './runIsolatedPromptRound';

jest.mock('../main/runPromptRound', () => ({ runPromptRound: jest.fn() }));

/** Runs real local Git operations without a shell or network access. */
const EXECUTE_FILE = promisify(execFile);

describe('isolated workspace project and repository context', () => {
    let repositoryPath: string;
    let originalEnvironment: NodeJS.ProcessEnv;

    /** Runs Git using only this temporary repository's identity and configuration. */
    async function git(directory: string, ...argumentsList: string[]): Promise<string> {
        return (await EXECUTE_FILE('git', argumentsList, { cwd: directory, env: process.env })).stdout.trim();
    }

    beforeEach(async () => {
        repositoryPath = await realpath(await mkdtemp(join(tmpdir(), 'ptbk-isolated-workspace-')));
        originalEnvironment = { ...process.env };
        process.env.GIT_CONFIG_GLOBAL = join(repositoryPath, 'empty-global-config');
        process.env.GIT_CONFIG_NOSYSTEM = '1';
        delete process.env.GIT_DIR;
        delete process.env.GIT_WORK_TREE;
        delete process.env.CODING_AGENT_GIT_NAME;
        delete process.env.CODING_AGENT_GIT_EMAIL;
        delete process.env.CODING_AGENT_GIT_SIGNING_KEY;
        await git(repositoryPath, 'init');
        await git(repositoryPath, 'config', 'user.name', 'Isolation Test');
        await git(repositoryPath, 'config', 'user.email', 'isolation@example.com');
        await git(repositoryPath, 'config', 'commit.gpgsign', 'false');
        await writeFile(join(repositoryPath, '.gitignore'), '.promptbook/\n.env\n');
        jest.spyOn(console, 'info').mockImplementation(() => undefined);
        jest.mocked(runPromptRound).mockReset();
    });

    afterEach(async () => {
        process.env = originalEnvironment;
        jest.restoreAllMocks();
        await rm(repositoryPath, { recursive: true, force: true });
    });

    it.each(['root', 'nested'])(
        'runs and commits in the requested %s project within the linked worktree',
        async (mode) => {
            const projectPath = mode === 'nested' ? join(repositoryPath, 'packages/project') : repositoryPath;
            await mkdir(join(projectPath, 'prompts'), { recursive: true });
            await mkdir(join(projectPath, 'agents/.core'), { recursive: true });
            await writeFile(join(projectPath, 'agents/.core/adam.book'), 'Adam\nFROM @Null\nRULE Local foundation.');
            await writeFile(join(projectPath, 'agents/developer.book'), 'Developer\nRULE Selected project developer.');
            await writeFile(join(projectPath, 'AGENTS.md'), 'Selected project context.');
            const promptPath = join(projectPath, 'prompts/task.md');
            await writeFile(promptPath, '[ ]\n\nImplement the project feature.\n');
            await writeFile(join(projectPath, 'README.md'), '# Requested project\n');
            await writeFile(join(projectPath, '.env'), 'PROJECT_VALUE=keep-project-environment\n');
            await git(repositoryPath, 'add', '.');
            await git(repositoryPath, 'commit', '-m', 'Fixture');
            await writeFile(join(repositoryPath, 'unrelated.txt'), 'Keep unrelated user work.\n');
            const workspace = await $resolveWorkspaceRepository(projectPath);
            const file = parsePromptFile(promptPath, await readFile(promptPath, 'utf-8'));
            const options: RunOptions = {
                workspace,
                agent: mode === 'nested' ? join(projectPath, 'agents/developer.book') : undefined,
                context: mode === 'nested' ? join(projectPath, 'AGENTS.md') : undefined,
                dryRun: false,
                preserveLogs: false,
                noUi: true,
                waitForUser: false,
                waitAfterPrompt: 0,
                waitBetweenPrompts: 0,
                waitAfterError: 0,
                noCommit: false,
                gitChanges: 'fail',
                normalizeLineEndings: false,
                allowCredits: false,
                autoMigrate: false,
                allowDestructiveAutoMigrate: false,
                autoPush: false,
                autoPull: false,
                priority: 0,
            };
            jest.mocked(runPromptRound).mockImplementation(async (round) => {
                const isolatedWorkspace = round.options.workspace!;
                expect(isolatedWorkspace.repositoryRoot).not.toBe(repositoryPath);
                expect(isolatedWorkspace.projectPath).toBe(round.projectPath);
                expect(relative(isolatedWorkspace.repositoryRoot!, isolatedWorkspace.projectPath)).toBe(
                    relative(repositoryPath, projectPath),
                );
                expect(await readFile(join(isolatedWorkspace.projectPath, '.env'), 'utf-8')).toBe(
                    'PROJECT_VALUE=keep-project-environment\n',
                );
                if (mode === 'nested') {
                    await expect(readFile(join(isolatedWorkspace.repositoryRoot!, '.env'))).rejects.toMatchObject({
                        code: 'ENOENT',
                    });
                }
                expect(round.options.autoPush).toBe(false);
                expect(round.resolvedCoderContext).toBe('Selected project context.');
                expect(round.resolvedAgentSystemMessage).toContain('Selected project developer.');
                expect(round.resolvedAgentSystemMessage).toContain('Local foundation.');
                expect(round.nextPrompt.file.path).toBe(join(isolatedWorkspace.projectPath, 'prompts/task.md'));
                expect(round.artifactsProjectPath).toBe(isolatedWorkspace.projectPath);
                await writeFile(
                    join(isolatedWorkspace.projectPath, 'generated.txt'),
                    'Generated in the requested project.\n',
                );
                await writeFile(round.nextPrompt.file.path, '[x]\n\nImplement the project feature.\n');
                expect(await readFile(promptPath, 'utf-8')).toMatch(/^\[ \]/u);
                await git(isolatedWorkspace.projectPath, 'add', 'generated.txt', 'prompts/task.md');
                await git(isolatedWorkspace.projectPath, 'commit', '-m', 'Isolated implementation');
            });

            await runIsolatedPromptRound({
                options,
                nextPrompt: { file, section: file.sections[0]! },
                promptLabel: 'Project feature',
                runner: { name: 'Mock harness', runPrompt: jest.fn() },
                runnerMetadata: { runnerName: 'Mock harness' },
                isRichUiEnabled: false,
                waitForRequestedPause: async () => undefined,
            });

            expect(runPromptRound).toHaveBeenCalledTimes(1);
            expect(await readFile(join(projectPath, 'generated.txt'), 'utf-8')).toBe(
                'Generated in the requested project.\n',
            );
            expect(await readFile(join(repositoryPath, 'unrelated.txt'), 'utf-8')).toBe('Keep unrelated user work.\n');
            expect(await git(repositoryPath, 'status', '--porcelain')).toBe('?? unrelated.txt');
            expect(await git(repositoryPath, 'worktree', 'list', '--porcelain')).not.toContain('ptbk-coder-isolation');
            if (mode === 'nested') expect(await readdir(projectPath)).not.toContain('.git');
        },
    );
});

// Note: [💞] Ignore a discrepancy between file name and entity name.
