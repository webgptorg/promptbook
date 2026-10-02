import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { ZERO_USAGE } from '../../../src/execution/utils/usage-constants';
import { executeWorkspaceGit, withWorkspaceMutation } from '../git/workspaceMutation';
import { prepareCoderExecution } from '../main/prepareCoderExecution';
import { WorkspaceGitSynchronization } from './WorkspaceGitSynchronization';
import { WorkspaceSupervisor } from './WorkspaceSupervisor';
import { createWorkspaceFixture } from './testing/workspaceFixture';

describe('workspace automatic Git synchronization', () => {
    let fixture: Awaited<ReturnType<typeof createWorkspaceFixture>>;
    let remotePath: string;
    let contributorPath: string;
    beforeEach(async () => {
        fixture = await createWorkspaceFixture();
        remotePath = join(fixture.root, '.promptbook/coder-isolation-worktrees/remote.git');
        contributorPath = join(fixture.root, '.promptbook/coder-isolation-worktrees/contributor');
        await mkdir(remotePath, { recursive: true });
        await executeWorkspaceGit(remotePath, ['init', '--bare', '--initial-branch=main']);
        await executeWorkspaceGit(fixture.root, ['remote', 'add', 'origin', remotePath]);
        await executeWorkspaceGit(fixture.root, ['push', '--set-upstream', 'origin', 'main']);
        await executeWorkspaceGit(fixture.root, ['clone', remotePath, contributorPath]);
        await executeWorkspaceGit(contributorPath, ['config', 'user.name', 'Contributor']);
        await executeWorkspaceGit(contributorPath, ['config', 'user.email', 'contributor@example.test']);
        await executeWorkspaceGit(contributorPath, ['config', 'commit.gpgsign', 'false']);
    });
    afterEach(async () => {
        await fixture.dispose();
    });

    /** Makes an independent non-rewriting remote update. */
    async function updateRemote(path: string, content: string): Promise<void> {
        await writeFile(join(contributorPath, path), content);
        await executeWorkspaceGit(contributorPath, ['add', '--', path]);
        await executeWorkspaceGit(contributorPath, ['commit', '-m', 'Independent update']);
        await executeWorkspaceGit(contributorPath, ['push']);
    }

    /** Calls the production synchronization service under the same cross-process mutation lease. */
    async function synchronize(service: WorkspaceGitSynchronization): Promise<boolean> {
        return withWorkspaceMutation(fixture.workspace, () => service.synchronize(true));
    }

    it('pulls file changes, refreshes the same Book identity and pushes scoped UI commits', async () => {
        const identity = (await fixture.collection.listWorkspaceAgents())[0]!.id;
        const service = new WorkspaceGitSynchronization(fixture.workspace, fixture.state, fixture.options);
        await service.initialize();
        await updateRemote('agents/developer.book', 'Developer\nGOAL Pulled definition.\n');
        expect(await synchronize(service)).toBe(true);
        expect(await fixture.collection.getAgentSource(identity)).toContain('Pulled definition');
        const before = await fixture.collection.getAgentSource(identity);
        await fixture.collection.updateAgentSource(identity, 'Developer\nGOAL Saved through UI.\n', {
            expectedSource: before,
        });
        expect(fixture.state.getControl().synchronization).toBe('push-pending');
        expect(await synchronize(service)).toBe(true);
        expect(fixture.state.getControl().synchronization).toBe('ready');
        expect(await executeWorkspaceGit(remotePath, ['show', 'main:agents/developer.book'])).toContain(
            'Saved through UI',
        );
        expect(await executeWorkspaceGit(fixture.root, ['status', '--porcelain', '--', '.promptbook/servers'])).toBe(
            '',
        );
    });

    it('preserves unrelated staged and unstaged files while pushing and defers a dirty pull', async () => {
        await writeFile(join(fixture.root, 'staged.txt'), 'Preserve staged');
        await writeFile(join(fixture.root, 'unstaged.txt'), 'Preserve unstaged');
        await executeWorkspaceGit(fixture.root, ['add', '--', 'staged.txt']);
        const id = (await fixture.collection.listWorkspaceAgents())[0]!.id;
        await fixture.collection.updateAgentSource(id, 'Developer\nGOAL Local source.\n', {
            expectedSource: await fixture.collection.getAgentSource(id),
        });
        const service = new WorkspaceGitSynchronization(fixture.workspace, fixture.state, fixture.options);
        expect(await synchronize(service)).toBe(true);
        expect(await executeWorkspaceGit(fixture.root, ['diff', '--cached', '--name-only'])).toBe('staged.txt');
        expect(await readFile(join(fixture.root, 'unstaged.txt'), 'utf-8')).toBe('Preserve unstaged');
        await executeWorkspaceGit(contributorPath, ['pull', '--ff-only']);
        await updateRemote('remote.txt', 'Upstream work');
        expect(await synchronize(service)).toBe(false);
        expect(fixture.state.getControl()).toMatchObject({
            synchronization: 'blocked',
            reason: expect.stringContaining('local changes'),
        });
    });

    it('shows divergence without resetting, cleaning, stashing or rewriting local history', async () => {
        const id = (await fixture.collection.listWorkspaceAgents())[0]!.id;
        await fixture.collection.updateAgentSource(id, 'Developer\nGOAL Retain local commit.\n', {
            expectedSource: await fixture.collection.getAgentSource(id),
        });
        const head = await executeWorkspaceGit(fixture.root, ['rev-parse', 'HEAD']);
        await updateRemote('remote.txt', 'Divergent work');
        const service = new WorkspaceGitSynchronization(fixture.workspace, fixture.state, fixture.options);
        expect(await synchronize(service)).toBe(false);
        expect(fixture.state.getControl().reason).toContain('diverged');
        expect(await executeWorkspaceGit(fixture.root, ['rev-parse', 'HEAD'])).toBe(head);
        await expect(
            fixture.collection.updateAgentSource(id, 'Developer\nGOAL Unsafe save.\n', {
                expectedSource: await fixture.collection.getAgentSource(id),
            }),
        ).rejects.toThrow('needs recovery');
    });

    it('retains successful implementation after rejected push, restart and subsequent successful synchronization', async () => {
        await writeFile(join(remotePath, 'hooks/pre-receive'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
        await writeFile(join(fixture.root, 'prompts/once.md'), '[ ] !!\nImplement once.\n');
        const runPrompt = jest.fn(async () => {
            await writeFile(join(fixture.root, 'result.txt'), 'Implemented exactly once');
            return { usage: ZERO_USAGE };
        });
        const service = new WorkspaceGitSynchronization(fixture.workspace, fixture.state, fixture.options);
        const createSupervisor = () =>
            new WorkspaceSupervisor(fixture.options, fixture.collection, fixture.state, service, {
                discoverHarnesses: async () => ['openai-codex'],
                prepareExecution: async (options, agent, context) => ({
                    ...(await prepareCoderExecution(options, agent, context)),
                    runner: { name: 'openai-codex', runPrompt },
                }),
            });
        await service.initialize();
        await createSupervisor().tick();
        const commit = fixture.state.listJobs()[0]!.commit;
        expect(fixture.state.listJobs()[0]!.status).toBe('completed');
        expect(fixture.state.getControl().synchronization).toBe('push-pending');
        await createSupervisor().tick();
        expect(runPrompt).toHaveBeenCalledTimes(1);
        expect(fixture.state.listJobs()[0]!.commit).toBe(commit);
        await rm(join(remotePath, 'hooks/pre-receive'));
        expect(await synchronize(service)).toBe(true);
        expect(await executeWorkspaceGit(remotePath, ['rev-parse', 'main'])).toBe(commit);
        expect(runPrompt).toHaveBeenCalledTimes(1);
    });

    it('keeps new repositories usable locally', async () => {
        await executeWorkspaceGit(fixture.root, ['remote', 'remove', 'origin']);
        const service = new WorkspaceGitSynchronization(fixture.workspace, fixture.state, fixture.options);
        await service.initialize();
        expect(await synchronize(service)).toBe(true);
        expect(fixture.state.getControl()).toMatchObject({
            synchronization: 'local-only',
            reason: expect.stringContaining('remote'),
        });
    });
    it('reports explicit synchronization opt-outs and pushes a new source commit at its boundary', async () => {
        const disabled = new WorkspaceGitSynchronization(fixture.workspace, fixture.state, {
            autoPull: false,
            autoPush: false,
        });
        await disabled.initialize();
        expect(fixture.state.getControl()).toMatchObject({
            synchronization: 'local-only',
            reason: expect.stringContaining('disabled'),
        });
        const service = new WorkspaceGitSynchronization(fixture.workspace, fixture.state, fixture.options);
        await service.initialize();
        await withWorkspaceMutation(fixture.workspace, () => service.synchronize());
        const source = await fixture.collection.getAgentSource('developer');
        await fixture.collection.updateAgentSource('developer', source + '\nRULE Source boundary.\n', {
            expectedSource: source,
        });
        expect(fixture.state.getControl().isCommitSynchronizationRequested).toBe(true);
        await withWorkspaceMutation(fixture.workspace, () => service.synchronize());
        expect(await executeWorkspaceGit(remotePath, ['rev-parse', 'main'])).toBe(
            await executeWorkspaceGit(fixture.root, ['rev-parse', 'HEAD']),
        );
    });
    it('bounds rejected push retries even when later implementation/source boundaries ask for synchronization', async () => {
        const service = new WorkspaceGitSynchronization(fixture.workspace, fixture.state, fixture.options);
        await service.initialize();
        const hook = join(remotePath, 'hooks/pre-receive');
        await writeFile(hook, '#!/bin/sh\necho rejected >> ../push-attempts\nexit 1\n', { mode: 0o755 });
        await writeFile(join(fixture.root, 'pending.txt'), 'Pending local commit');
        await executeWorkspaceGit(fixture.root, ['add', '--', 'pending.txt']);
        await executeWorkspaceGit(fixture.root, ['commit', '-m', 'Pending']);
        let clockTime = Date.now();
        const clock = jest.spyOn(Date, 'now').mockImplementation(() => clockTime);
        try {
            for (let attempt = 0; attempt < 5; attempt++) {
                clockTime += 300_000;
                await withWorkspaceMutation(fixture.workspace, () => service.synchronize(false, true));
            }
            expect((await readFile(join(remotePath, '..', 'push-attempts'), 'utf-8')).trim().split('\n')).toHaveLength(
                3,
            );
            expect(fixture.state.getControl().synchronization).toBe('push-pending');
            await rm(hook);
            expect(await synchronize(service)).toBe(true);
            expect(fixture.state.getControl().synchronization).toBe('ready');
        } finally {
            clock.mockRestore();
        }
    });
});
