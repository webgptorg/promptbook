import { mkdir, readFile, rename, rm, symlink, writeFile } from 'fs/promises';
import { join } from 'path';
import type { string_book } from '../../../src/book-2.0/agent-source/string_book';
import { executeWorkspaceGit, withWorkspaceMutation, acquireWorkspaceLease } from '../git/workspaceMutation';
import { AgentCollectionInWorkspace } from './AgentCollectionInWorkspace';
import { hashWorkspaceSource, resolveConfinedAgentPath } from './workspaceAgentFiles';
import { createWorkspaceFixture } from './testing/workspaceFixture';
import type { WorkspaceMutationRecord } from './WorkspaceState';

describe('workspace authoritative agent collection', () => {
    let fixture: Awaited<ReturnType<typeof createWorkspaceFixture>>;
    beforeEach(async () => {
        fixture = await createWorkspaceFixture();
    });
    afterEach(async () => {
        await fixture.dispose();
    });
    it('creates, edits, renames, deletes and restores a Book with stable identity and scoped commits', async () => {
        await writeFile(join(fixture.root, 'unrelated.txt'), 'staged user work');
        await executeWorkspaceGit(fixture.root, ['add', '--', 'unrelated.txt']);
        const agent = await fixture.collection.createAgent('Designer\nGOAL Design.\n' as string_book);
        const before = await fixture.collection.getAgentSource(agent.permanentId);
        await fixture.collection.updateAgentSource(
            agent.permanentId,
            before.replace('Design.', 'Improve design.') as string_book,
            { expectedSource: before },
        );
        const edited = await fixture.collection.getAgentSource(agent.permanentId);
        await fixture.collection.updateAgentSource(
            agent.permanentId,
            edited.replace('Designer', 'Product Designer') as string_book,
            { expectedSourceHash: hashWorkspaceSource(edited) },
        );
        expect(await fixture.collection.getAgentPermanentId('product-designer')).toBe(agent.permanentId);
        expect(await readFile(join(fixture.root, 'agents/product-designer.book'), 'utf-8')).toContain(
            'Improve design.',
        );
        await expect(readFile(join(fixture.root, 'agents/designer.book'))).rejects.toMatchObject({ code: 'ENOENT' });
        await fixture.collection.deleteAgent(agent.permanentId);
        expect((await fixture.collection.listDeletedAgents()).map((entry) => entry.permanentId)).toContain(
            agent.permanentId,
        );
        await fixture.collection.restoreAgent(agent.permanentId);
        expect((await fixture.collection.findAgentBasicInformation(agent.permanentId))?.permanentId).toBe(
            agent.permanentId,
        );
        expect(await executeWorkspaceGit(fixture.root, ['diff', '--cached', '--name-only'])).toBe('unrelated.txt');
        const changed = await executeWorkspaceGit(fixture.root, ['log', '--format=', '--name-only', 'HEAD~5..HEAD']);
        expect(changed).not.toContain('unrelated.txt');
        expect(changed).not.toMatch(/sqlite|\.env/u);
        const count = await executeWorkspaceGit(fixture.root, ['rev-list', '--count', 'HEAD']);
        const current = await fixture.collection.getAgentSource(agent.permanentId);
        await fixture.collection.updateAgentSource(agent.permanentId, current, { expectedSource: current });
        expect(await executeWorkspaceGit(fixture.root, ['rev-list', '--count', 'HEAD'])).toBe(count);
    });
    it('rejects stale edits, dirty source absorption, portable collisions and symlink/path escapes', async () => {
        const developer = (await fixture.collection.listAgents())[0]!;
        const initial = await fixture.collection.getAgentSource(developer.permanentId!);
        await writeFile(join(fixture.root, 'agents/developer.book'), initial + 'RULE External editor change.\n');
        await expect(
            fixture.collection.updateAgentSource(
                developer.permanentId!,
                (initial + 'RULE Browser change.\n') as string_book,
                { expectedSource: initial },
            ),
        ).rejects.toMatchObject({ name: 'ConflictError' });
        const external = await fixture.collection.getAgentSource(developer.permanentId!);
        await expect(
            fixture.collection.updateAgentSource(
                developer.permanentId!,
                (external + 'RULE More browser content.\n') as string_book,
                { expectedSource: external },
            ),
        ).rejects.toThrow('uncommitted local work');
        expect(await readFile(join(fixture.root, 'agents/developer.book'), 'utf-8')).toBe(external);
        await expect(
            fixture.collection.createAgent('Developer\nGOAL Other agent.\n' as string_book),
        ).rejects.toMatchObject({ name: 'ConflictError' });
        await mkdir(join(fixture.root, 'agents/nested'));
        await symlink(fixture.root, join(fixture.root, 'agents/outside'));
        for (const path of [
            'agents/../escape.book',
            'agents/outside/evil.book',
            'agents/CON.book',
            'agents/Developer.book',
            'agents/nested/../../evil.book',
        ])
            await expect(resolveConfinedAgentPath(fixture.root, path)).rejects.toThrow();
    });
    it('reflects external moves, edits, removals and additions without committing watcher activity', async () => {
        const initial = (await fixture.collection.listAgents())[0]!;
        const head = await executeWorkspaceGit(fixture.root, ['rev-parse', 'HEAD']);
        await mkdir(join(fixture.root, 'agents/helpers'));
        await rename(join(fixture.root, 'agents/developer.book'), join(fixture.root, 'agents/helpers/developer.book'));
        expect((await fixture.collection.listAgents())[0]!.permanentId).toBe(initial.permanentId);
        await writeFile(
            join(fixture.root, 'agents/helpers/developer.book'),
            'Renamed Developer\nGOAL Updated locally.\n',
        );
        const reopened = new AgentCollectionInWorkspace(fixture.workspace, fixture.client, fixture.state);
        expect((await reopened.listAgents())[0]!.permanentId).toBe(initial.permanentId);
        expect((await reopened.listAgents())[0]!.agentName).toBe('renamed-developer');
        await writeFile(join(fixture.root, 'agents/helper.book'), 'Helper\nGOAL Consult.\n');
        expect(await reopened.listAgents()).toHaveLength(2);
        await writeFile(join(fixture.root, 'agents/broken.book'), '@@@');
        expect(
            (await reopened.listWorkspaceAgents()).find((agent) => agent.path.endsWith('broken.book'))?.error,
        ).toBeTruthy();
        await rm(join(fixture.root, 'agents/helpers/developer.book'));
        expect(await reopened.findAgentBasicInformation(initial.permanentId!)).toBeNull();
        expect(await executeWorkspaceGit(fixture.root, ['rev-parse', 'HEAD'])).toBe(head);
    });
    it('groups folder creation, move/rename, deletion and restoration into one commit per logical operation', async () => {
        const developer = (await fixture.collection.listAgents())[0]!;
        await fixture.collection.mutateOrganization(async () => {
            await fixture.client.from('AgentFolder').insert({ id: 1, name: 'Team', parentId: null, sortOrder: 0 });
            await fixture.client.from('Agent').update({ folderId: 1 }).eq('permanentId', developer.permanentId!);
        });
        expect(await readFile(join(fixture.root, 'agents/Team/developer.book'), 'utf-8')).toContain('Developer');
        let head = await executeWorkspaceGit(fixture.root, ['rev-parse', 'HEAD']);
        await fixture.collection.mutateOrganization(async () => {
            await fixture.client.from('AgentFolder').update({ name: 'Engineering' }).eq('id', 1);
            const source = await fixture.collection.getAgentSource(developer.permanentId!);
            await fixture.collection.updateAgentSource(
                developer.permanentId!,
                (source + 'RULE Changed in same operation.\n') as string_book,
                { expectedSource: source },
            );
        });
        expect(await executeWorkspaceGit(fixture.root, ['rev-list', '--count', `${head}..HEAD`])).toBe('1');
        expect(await readFile(join(fixture.root, 'agents/Engineering/developer.book'), 'utf-8')).toContain(
            'same operation',
        );
        await expect(readFile(join(fixture.root, 'agents/Team/developer.book'))).rejects.toThrow();
        await fixture.collection.mutateOrganization(async () => {
            await fixture.client.from('AgentFolder').update({ deletedAt: new Date().toISOString() }).eq('id', 1);
            await fixture.collection.deleteAgent(developer.permanentId!);
        });
        head = await executeWorkspaceGit(fixture.root, ['rev-parse', 'HEAD']);
        await fixture.collection.mutateOrganization(async () => {
            await fixture.client.from('AgentFolder').update({ deletedAt: null }).eq('id', 1);
            await fixture.collection.restoreAgent(developer.permanentId!);
        });
        expect(await executeWorkspaceGit(fixture.root, ['rev-list', '--count', `${head}..HEAD`])).toBe('1');
        expect((await fixture.collection.listAgents())[0]!.permanentId).toBe(developer.permanentId);
    });
    it('preserves history through an external move with an edit and a Git rename with an edit', async () => {
        const initial = (await fixture.collection.listAgents())[0]!;
        await mkdir(join(fixture.root, 'agents/team'));
        await rename(join(fixture.root, 'agents/developer.book'), join(fixture.root, 'agents/team/developer.book'));
        await writeFile(
            join(fixture.root, 'agents/team/developer.book'),
            'Developer\nGOAL Implement.\nRULE Local move and edit.\n',
        );
        expect(await fixture.collection.getAgentPermanentId('developer')).toBe(initial.permanentId);
        await executeWorkspaceGit(fixture.root, ['add', '--', 'agents']);
        await executeWorkspaceGit(fixture.root, ['commit', '-m', 'Manual move']);
        await fixture.collection.reconcile();
        await rename(join(fixture.root, 'agents/team/developer.book'), join(fixture.root, 'agents/developer.book'));
        await writeFile(
            join(fixture.root, 'agents/developer.book'),
            'Developer\nGOAL Implement.\nRULE Local move and edit.\nRULE Pulled edit.\n',
        );
        await executeWorkspaceGit(fixture.root, ['add', '--', 'agents']);
        await executeWorkspaceGit(fixture.root, ['commit', '-m', 'Pulled rename']);
        // Simulate a checkout/pull replacing the inode while retaining Git's rename relationship.
        const content = await readFile(join(fixture.root, 'agents/developer.book'), 'utf-8');
        await rm(join(fixture.root, 'agents/developer.book'));
        await writeFile(join(fixture.root, 'agents/developer.book'), content);
        const reopened = new AgentCollectionInWorkspace(fixture.workspace, fixture.client, fixture.state);
        expect(await reopened.getAgentPermanentId('developer')).toBe(initial.permanentId);
        expect(await reopened.listAgentHistory(initial.permanentId!)).toHaveLength(3);
    });
    it('blocks duplicate source identities instead of leaving one executable stale definition', async () => {
        await writeFile(
            join(fixture.root, 'agents/developer.book'),
            'Developer\nGOAL Implement.\nMETA ID SameIdentity\n',
        );
        await writeFile(join(fixture.root, 'agents/second.book'), 'Second\nGOAL Design.\nMETA ID SameIdentity\n');
        const agents = await fixture.collection.listWorkspaceAgents();
        expect(agents).toHaveLength(2);
        expect(agents.every((agent) => agent.error?.includes('META ID'))).toBe(true);
        expect(await fixture.collection.listAgents()).toHaveLength(0);
    });
    it('retains a failed commit for explicit recovery and recognizes its existing commit after interruption', async () => {
        const hook = join(fixture.root, '.git/hooks/pre-commit');
        await writeFile(hook, '#!/bin/sh\nexit 1\n', { mode: 0o755 });
        await expect(fixture.collection.createAgent('Recovery Agent\nGOAL Recover.\n' as string_book)).rejects.toThrow(
            'could not be fully committed',
        );
        expect(await readFile(join(fixture.root, 'agents/recovery-agent.book'), 'utf-8')).toContain('Recover.');
        await rm(hook);
        await fixture.collection.recoverMutations(true);
        const record = fixture.state.readValues<WorkspaceMutationRecord>('WorkspaceMutation')[0]!;
        expect(record.status).toBe('committed');
        const head = await executeWorkspaceGit(fixture.root, ['rev-parse', 'HEAD']);
        fixture.state.writeValue('WorkspaceMutation', record.id, { ...record, status: 'saved' });
        await fixture.collection.recoverMutations();
        expect(await executeWorkspaceGit(fixture.root, ['rev-parse', 'HEAD'])).toBe(head);
        expect(fixture.state.readValues<WorkspaceMutationRecord>('WorkspaceMutation')[0]!.status).toBe('committed');
    });
    it('rejects two supervisors and overlapping CLI/UI mutations without stealing a live lease', async () => {
        const lock = join(fixture.root, '.promptbook/workspace-server.lock');
        const release = await acquireWorkspaceLease(lock);
        await expect(acquireWorkspaceLease(lock)).rejects.toMatchObject({ name: 'ConflictError' });
        await release();
        await (
            await acquireWorkspaceLease(lock)
        )();
        await withWorkspaceMutation(fixture.workspace, async () => {
            // A separate async ownership chain emulates the web process, rather than reentering the current operation.
            const owner = JSON.parse(
                await readFile(join(fixture.root, '.git/ptbk-coder-mutation.lock/owner.json'), 'utf-8'),
            );
            expect(owner.pid).toBe(process.pid);
            await expect(
                acquireWorkspaceLease(join(fixture.root, '.git/ptbk-coder-mutation.lock')),
            ).rejects.toMatchObject({ name: 'ConflictError' });
        });
    });
});
