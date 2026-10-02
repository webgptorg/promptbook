import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { ZERO_USAGE } from '../../../src/execution/utils/usage-constants';
import { executeWorkspaceGit } from '../git/workspaceMutation';
import { prepareCoderExecution } from '../main/prepareCoderExecution';
import { WorkspaceSupervisor } from './WorkspaceSupervisor';
import { WorkspaceGitSynchronization } from './WorkspaceGitSynchronization';
import { createWorkspaceFixture } from './testing/workspaceFixture';

/** Runs the real preparation/parser/round/verification/Git services with a deterministic paid-call-free harness. */
function createDeterministicSupervisor(fixture: Awaited<ReturnType<typeof createWorkspaceFixture>>) {
    const runPrompt = jest.fn(async (options: { projectPath: string; prompt: string }) => {
        await writeFile(
            join(options.projectPath, 'implementation.txt'),
            (await readFile(join(options.projectPath, 'implementation.txt'), 'utf-8').catch(() => '')) +
                options.prompt +
                '\n',
        );
        return { usage: ZERO_USAGE };
    });
    const synchronization = new WorkspaceGitSynchronization(fixture.workspace, fixture.state, fixture.options);
    const supervisor = new WorkspaceSupervisor(
        { ...fixture.options, agentName: undefined },
        fixture.collection,
        fixture.state,
        synchronization,
        {
            discoverHarnesses: async () => ['openai-codex', 'qwen-code'],
            prepareExecution: async (options, agent, context) => ({
                ...(await prepareCoderExecution(options, agent, context)),
                runner: { name: options.agentName!, runPrompt },
            }),
        },
    );
    return { supervisor, runPrompt, synchronization };
}

describe('workspace autonomous scheduling', () => {
    let fixture: Awaited<ReturnType<typeof createWorkspaceFixture>>;
    beforeEach(async () => {
        fixture = await createWorkspaceFixture({
            'developer.book': 'Developer\nGOAL Implement tasks.\n',
            'design/designer.book': 'Designer\nGOAL Design tasks.\n',
            'helper.book': 'Helper\nGOAL Advisory consultations only.\n',
        });
    });
    afterEach(async () => {
        await fixture.dispose();
    });
    it('executes several appropriate Books across priorities using the same real finite-run execution services', async () => {
        await writeFile(
            join(fixture.root, '.promptbook/config.json'),
            JSON.stringify({ coder: { agents: { designer: { harness: 'qwen-code' } } } }),
        );
        await writeFile(join(fixture.root, 'prompts/high.md'), '[ ] `Developer` !!\n\nImplement high priority.\n');
        await writeFile(join(fixture.root, 'prompts/design.md'), '[ ] `Designer` !\n\nImplement design.\n');
        await writeFile(join(fixture.root, 'prompts/default.md'), '[ ]\n\nImplement untargeted work.\n');
        await writeFile(join(fixture.root, 'prompts/done.md'), '[x]\nNever rerun.\n');
        await writeFile(join(fixture.root, 'prompts/not-ready.md'), '[-]\nDo not run.\n');
        await writeFile(join(fixture.root, 'prompts/README.md'), 'Documentation.\n');
        await writeFile(join(fixture.root, 'prompts/template.md'), '<!--ptbk-coder-ignore-->\nTemplate.\n');
        const { supervisor, runPrompt, synchronization } = createDeterministicSupervisor(fixture);
        await synchronization.initialize();
        await supervisor.tick();
        await supervisor.tick();
        await supervisor.tick();
        await supervisor.tick();
        const completed = fixture.state
            .listJobs()
            .filter((job) => job.status === 'completed')
            .sort((left, right) => right.priority - left.priority);
        expect(fixture.state.listJobs().filter((job) => job.status !== 'completed')).toEqual([]);
        expect(completed.map((job) => job.priority)).toEqual([2, 1, 0]);
        expect(completed.map((job) => job.agentName)).toEqual(['developer', 'designer', 'developer']);
        expect(completed[1]!.harness).toBe('qwen-code');
        expect(completed.every((job) => job.source && job.prompt && job.commit)).toBe(true);
        expect(runPrompt).toHaveBeenCalledTimes(3);
        expect(completed.some((job) => job.agentName === 'helper')).toBe(false);
        expect(await readFile(join(fixture.root, 'prompts/high.md'), 'utf-8')).toContain('[x]');
        expect(
            await executeWorkspaceGit(fixture.root, [
                'status',
                '--porcelain',
                '--untracked-files=all',
                '--',
                '.promptbook',
            ]),
        ).toContain('.promptbook/config.json');
    });
    it('watches new Books and ready work, and exposes unavailable/unknown targets without switching providers', async () => {
        const { supervisor, runPrompt, synchronization } = createDeterministicSupervisor(fixture);
        await synchronization.initialize();
        await supervisor.tick();
        expect(runPrompt).not.toHaveBeenCalled();
        await writeFile(join(fixture.root, 'agents/reviewer.book'), 'Reviewer\nGOAL Review implementation.\n');
        await writeFile(join(fixture.root, 'prompts/new.md'), '[ ] `Reviewer` !!!\nNew work.\n');
        await writeFile(join(fixture.root, 'prompts/missing.md'), '[ ] `Nonexistent Book`\nBlocked work.\n');
        await writeFile(
            join(fixture.root, 'prompts/unavailable.md'),
            '[ ] `Developer` `claude-code`\nConfigured unavailable harness.\n',
        );
        await supervisor.tick();
        expect(fixture.state.listJobs().find((job) => job.path.endsWith('new.md'))).toMatchObject({
            status: 'completed',
            agentName: 'reviewer',
        });
        expect(fixture.state.listJobs().filter((job) => job.status === 'blocked')).toHaveLength(2);
        expect(runPrompt).toHaveBeenCalledTimes(1);
        await supervisor.tick();
        expect(runPrompt).toHaveBeenCalledTimes(1);
    });
    it('uses shared pause/claim state and records interrupted work for review instead of blind repetition', async () => {
        await writeFile(join(fixture.root, 'prompts/paused.md'), '[ ]\nPaused work.\n');
        const { supervisor, runPrompt, synchronization } = createDeterministicSupervisor(fixture);
        await synchronization.initialize();
        fixture.state.updateControl({ isPaused: true });
        await supervisor.tick();
        const job = fixture.state.listJobs()[0]!;
        expect(job.status).toBe('ready');
        expect(runPrompt).not.toHaveBeenCalled();
        fixture.state.updateControl({ isPaused: false });
        expect(fixture.state.claimJob(job.id, { source: 'Recorded source' })).toBeTruthy();
        expect(fixture.state.claimJob(job.id, {})).toBeNull();
        const restarted = createDeterministicSupervisor(fixture);
        await restarted.supervisor.tick();
        expect(fixture.state.listJobs()[0]!.status).toBe('recovery');
        expect(restarted.runPrompt).not.toHaveBeenCalled();
    });
    it('does not rerun verified side effects when committing fails or a manual PRD edit overlaps a status save', async () => {
        await writeFile(join(fixture.root, 'prompts/recover.md'), '[ ]\nRecover work.\n');
        const hook = join(fixture.root, '.git/hooks/pre-commit');
        await writeFile(hook, '#!/bin/sh\nexit 1\n', { mode: 0o755 });
        const { supervisor, runPrompt, synchronization } = createDeterministicSupervisor(fixture);
        await synchronization.initialize();
        await supervisor.tick();
        await supervisor.tick();
        expect(runPrompt).toHaveBeenCalledTimes(1);
        expect(fixture.state.listJobs()[0]!.status).toBe('recovery');
        expect(await readFile(join(fixture.root, 'prompts/recover.md'), 'utf-8')).toContain('[x]');
    });
    it('requires successful prerequisite status and protects unrelated dirty/staged changes', async () => {
        await writeFile(join(fixture.root, 'prompts/prerequisite.md'), '[!]\nFailed prerequisite.\n');
        await writeFile(
            join(fixture.root, 'prompts/dependent.md'),
            '[ ] !!!\nPREREQUISITE: [required](prerequisite.md)\nImplement only afterwards.\n',
        );
        await writeFile(join(fixture.root, 'prompts/healthy.md'), '[ ]\nHealthy task.\n');
        await writeFile(join(fixture.root, 'unrelated.txt'), 'Preserve staged work.');
        await executeWorkspaceGit(fixture.root, ['add', '--', 'unrelated.txt']);
        const { supervisor, runPrompt, synchronization } = createDeterministicSupervisor(fixture);
        await synchronization.initialize();
        await supervisor.tick();
        expect(fixture.state.listJobs().find((job) => job.path.endsWith('dependent.md'))?.reason).toContain(
            'has not completed',
        );
        expect(runPrompt).toHaveBeenCalledTimes(1);
        await writeFile(
            join(fixture.root, 'prompts/prerequisite.md'),
            '[x]\nImplemented but awaiting migration/recovery.\n',
        );
        fixture.state.discoverJob({
            id: 'prerequisite-review',
            path: 'prompts/prerequisite.md',
            section: 0,
            priority: 0,
            status: 'recovery',
            reason: 'Verification or migration needs review.',
            updatedAt: new Date().toISOString(),
        });
        await supervisor.tick();
        expect(fixture.state.listJobs().find((job) => job.path.endsWith('dependent.md'))?.reason).toContain(
            'status marker alone is insufficient',
        );
        expect(runPrompt).toHaveBeenCalledTimes(1);
        expect(await executeWorkspaceGit(fixture.root, ['diff', '--cached', '--name-only'])).toBe('unrelated.txt');
        expect(await executeWorkspaceGit(fixture.root, ['show', '--format=', '--name-only', 'HEAD'])).not.toContain(
            'unrelated.txt',
        );
    });
});
