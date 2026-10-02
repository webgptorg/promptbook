import type { SupabaseClient } from '@supabase/supabase-js';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { lstat, mkdir, rmdir } from 'fs/promises';
import { join, relative } from 'path';
import { basename, dirname } from 'path';
import { spaceTrim } from 'spacetrim';
import type { AgentBasicInformation } from '../../../src/book-2.0/agent-source/AgentBasicInformation';
import { parseAgentSource } from '../../../src/book-2.0/agent-source/parseAgentSource';
import type { string_book } from '../../../src/book-2.0/agent-source/string_book';
import type { WorkspaceRepositoryContext } from '../../../src/cli/cli-commands/common/workspaceRepository';
import type {
    AgentCollection,
    UpdateAgentSourceOptions,
} from '../../../src/collection/agent-collection/AgentCollection';
import { AgentCollectionInSupabase } from '../../../src/collection/agent-collection/constructors/agent-collection-in-supabase/AgentCollectionInSupabase';
import { prepareAgentSourceForPersistence } from '../../../src/collection/agent-collection/constructors/agent-collection-in-supabase/prepareAgentSourceForPersistence';
import type { CreateAgentInput } from '../../../src/collection/agent-collection/CreateAgentInput';
import { ConflictError } from '../../../src/errors/ConflictError';
import { NotFoundError } from '../../../src/errors/NotFoundError';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import { $randomBase58 } from '../../../src/utils/random/$randomBase58';
import { PROMPTBOOK_ENGINE_VERSION } from '../../../src/version';
import { commitChanges } from '../git/commitChanges';
import { listWorkingTreeChangedFiles } from '../git/workingTreeChanges';
import { acquireWorkspaceLease, executeWorkspaceGit, withWorkspaceMutation } from '../git/workspaceMutation';
import { WorkspaceState, type WorkspaceMutationRecord } from './WorkspaceState';
import {
    discoverWorkspaceAgentFiles,
    hashWorkspaceSource,
    readWorkspaceAgentFile,
    repositoryAgentPath,
    resolveConfinedAgentPath,
    WORKSPACE_AGENTS_MANIFEST,
    writeWorkspaceAgentFile,
    type WorkspaceAgentFile,
    type WorkspaceAgentsManifest,
    type WorkspaceFolder,
} from './workspaceAgentFiles';

/** Indexed application organization row, with operational ownership deliberately omitted from the versioned manifest. */
type OrganizationAgentRow = {
    permanentId: string;
    agentName: string;
    agentSource: string;
    folderId: number | null;
    sortOrder: number;
    deletedAt: string | null;
};

/** Organization actions read their own pending changes instead of reconciling the old manifest mid-operation. */
const ORGANIZATION_CONTEXT = new AsyncLocalStorage<{
    record: WorkspaceMutationRecord;
    manifest: WorkspaceAgentsManifest;
}>();

/** Derived filesystem/Git observations preserve identity across a move which also edits the source. */
type WorkspaceAgentObservation = {
    readonly head: string;
    readonly files: ReadonlyArray<{ readonly id: string; readonly identity: string; readonly path: string }>;
};

/**
 * Authoritative Books live in the selected workspace. SQLite contains derived profiles, history and operational data.
 * Both CLI discovery and the Next provider use this collection; watcher reconciliation never commits manual edits.
 */
export class AgentCollectionInWorkspace implements AgentCollection {
    public readonly options: { readonly tablePrefix: string; readonly isVerbose: boolean };
    private readonly databaseCollection: AgentCollectionInSupabase;
    private reconciliation?: Promise<void>;
    public constructor(
        private readonly workspace: WorkspaceRepositoryContext,
        private readonly client: SupabaseClient,
        public readonly state: WorkspaceState,
        tablePrefix = '',
        private readonly onDefinitionsChanged: () => void = () => undefined,
        private readonly environment?: NodeJS.ProcessEnv,
    ) {
        this.options = { tablePrefix, isVerbose: false };
        this.databaseCollection = new AgentCollectionInSupabase(client, this.options);
    }

    /** Reconciles additions, edits, moves and deletions against files without committing them. */
    public async reconcile(): Promise<void> {
        if (ORGANIZATION_CONTEXT.getStore()) return;
        if (this.reconciliation) return this.reconciliation;
        this.reconciliation = this.withReconciliationLease(() => this.reconcileFiles()).finally(() => {
            this.reconciliation = undefined;
        });
        return this.reconciliation;
    }

    /** Returns valid and invalid discovered definitions for execution readiness and the web view. */
    public async listWorkspaceAgents(): Promise<WorkspaceAgentFile[]> {
        await this.reconcile();
        return this.state.readValues<WorkspaceAgentFile>('WorkspaceAgentFile').filter((agent) => !agent.isDeleted);
    }

    /** Lists valid Books with their stable identities. */
    public async listAgents(): Promise<ReadonlyArray<AgentBasicInformation>> {
        const entries = await this.listWorkspaceAgents();
        return Promise.all(
            entries
                .filter((entry) => !entry.error)
                .map(async (entry) => ({
                    ...parseAgentSource(
                        (await readWorkspaceAgentFile(this.workspace.projectPath, entry.path))! as string_book,
                    ),
                    permanentId: entry.id,
                })),
        );
    }

    /** Finds a valid active Book by identity or parsed name. */
    public async findAgentBasicInformation(identifier: string): Promise<AgentBasicInformation | null> {
        return (
            (await this.listAgents()).find(
                (agent) => agent.permanentId === identifier || agent.agentName === identifier,
            ) ?? null
        );
    }

    /** Resolves identities without detaching deleted definitions from their history. */
    public async getAgentPermanentId(identifier: string): Promise<string> {
        await this.reconcile();
        const entry = this.findEntry(identifier);
        if (entry) return entry.id;
        return this.databaseCollection.getAgentPermanentId(identifier);
    }

    /** Reads the actual Book, refusing an invalid or removed source rather than serving its old cache. */
    public async getAgentSource(identifier: string): Promise<string_book> {
        await this.reconcile();
        const entry = this.findEntry(identifier);
        if (!entry || entry.isDeleted) throw new NotFoundError(`Workspace agent \`${identifier}\` has no active Book.`);
        if (entry.error) throw new NotAllowed(entry.error);
        const source = await readWorkspaceAgentFile(this.workspace.projectPath, entry.path);
        if (source === null) throw new NotFoundError(`Book \`${entry.path}\` was removed. Reload the agent.`);
        return source as string_book;
    }

    /** Creates a Book, versioned identity and one scoped local commit. */
    public async createAgent(
        source: string_book,
        options: Omit<CreateAgentInput, 'source'> = {},
    ): Promise<AgentBasicInformation & { permanentId: string }> {
        return withWorkspaceMutation(this.workspace, async () => {
            await this.reconcile();
            const prepared = prepareAgentSourceForPersistence(source, {
                visibility: options.visibility,
                isVisibilityOverride: options.visibility !== undefined,
            });
            const id = $randomBase58(14);
            const folders = await this.loadFolders();
            const folderPath = this.folderPath(options.folderId ?? null, folders);
            const path = `${folderPath}/${prepared.agentProfile.agentName}.book`;
            await this.assertNewPath(path);
            const manifest = await this.currentManifest();
            this.assertUniqueAgentName(prepared.agentProfile.agentName, manifest);
            const entry: WorkspaceAgentFile = {
                id,
                path,
                hash: hashWorkspaceSource(prepared.agentSource),
                name: prepared.agentProfile.agentName,
                sortOrder: options.sortOrder ?? 0,
            };
            await this.saveOperation(
                `Create agent ${entry.name}`,
                [{ path, before: null, after: prepared.agentSource }],
                { ...manifest, agents: [...manifest.agents, entry] },
            );
            if (ORGANIZATION_CONTEXT.getStore())
                await this.databaseCollection.createAgent(
                    `${prepared.agentSource}\nMETA ID ${id}\n` as string_book,
                    options,
                );
            return { ...parseAgentSource(prepared.agentSource), permanentId: id };
        });
    }

    /** Saves optimistically; a rename moves the Book while preserving its permanent identity. */
    public async updateAgentSource(
        identifier: string,
        source: string_book,
        options: UpdateAgentSourceOptions = {},
    ): Promise<void> {
        await withWorkspaceMutation(this.workspace, async () => {
            const before = await this.getAgentSource(identifier);
            if (options.expectedSource !== before && options.expectedSourceHash !== hashWorkspaceSource(before)) {
                throw new ConflictError(
                    spaceTrim(`
                    Agent \`${identifier}\` changed or no source revision was supplied.
                    Reload its current Book and submit \`expectedSource\` (or the Book editor's revision) before saving.
                `),
                );
            }
            const entry = this.findEntry(identifier)!;
            const prepared = prepareAgentSourceForPersistence(source);
            const after = prepared.agentSource;
            const path =
                entry.name === prepared.agentProfile.agentName
                    ? entry.path
                    : `${dirname(entry.path)}/${prepared.agentProfile.agentName}.book`;
            if (path !== entry.path) await this.assertNewPath(path);
            if (before === after && path === entry.path) return;
            const manifest = await this.currentManifest();
            this.assertUniqueAgentName(prepared.agentProfile.agentName, manifest, entry.id);
            const nextEntry = {
                ...entry,
                path,
                name: prepared.agentProfile.agentName,
                hash: hashWorkspaceSource(after),
            };
            const files =
                path === entry.path
                    ? [{ path, before, after }]
                    : [
                          { path: entry.path, before, after: null },
                          { path, before: null, after },
                      ];
            await this.saveOperation(`Update agent ${nextEntry.name}`, files, {
                ...manifest,
                agents: manifest.agents.map((agent) => (agent.id === entry.id ? nextEntry : agent)),
            });
            if (ORGANIZATION_CONTEXT.getStore()) await this.databaseCollection.updateAgentSource(identifier, after);
            // Source history is a database snapshot, not another editable source. Reconciliation already saved it.
            if (options.versionName) {
                const history = await this.databaseCollection.listAgentHistory(identifier);
                if (history[0])
                    await this.client
                        .from(`${this.options.tablePrefix}AgentHistory`)
                        .update({ versionName: options.versionName })
                        .eq('id', history[0].id);
            }
        });
    }

    /** Deletes only the selected source and records a versioned tombstone. */
    public async deleteAgent(identifier: string): Promise<void> {
        await withWorkspaceMutation(this.workspace, async () => {
            const before = await this.getAgentSource(identifier);
            const entry = this.findEntry(identifier)!;
            const manifest = await this.currentManifest();
            await this.saveOperation(`Delete agent ${entry.name}`, [{ path: entry.path, before, after: null }], {
                ...manifest,
                agents: manifest.agents.map((agent) => (agent.id === entry.id ? { ...agent, isDeleted: true } : agent)),
            });
            if (ORGANIZATION_CONTEXT.getStore()) await this.databaseCollection.deleteAgent(entry.id);
        });
    }

    /** Restores the same identity from operational history, without overwriting an occupied path. */
    public async restoreAgent(identifier: string): Promise<void> {
        await withWorkspaceMutation(this.workspace, async () => {
            await this.reconcile();
            const entry = this.findEntry(identifier);
            if (!entry) throw new NotFoundError(`Deleted agent \`${identifier}\` was not found.`);
            if (!entry.isDeleted) return;
            const history = await this.databaseCollection.listAgentHistorySnapshots(entry.id);
            if (!history[0])
                throw new NotFoundError(`No source history for \`${entry.name}\`. Recover its Book from Git.`);
            await this.assertNewPath(entry.path);
            const manifest = await this.currentManifest();
            await this.saveOperation(
                `Restore agent ${entry.name}`,
                [{ path: entry.path, before: null, after: history[0].agentSource }],
                {
                    ...manifest,
                    agents: manifest.agents.map((agent) =>
                        agent.id === entry.id ? { ...agent, isDeleted: false } : agent,
                    ),
                },
            );
            if (ORGANIZATION_CONTEXT.getStore()) await this.databaseCollection.restoreAgent(entry.id);
        });
    }

    /** Reads operational recycle-bin information. */
    public async listDeletedAgents() {
        await this.reconcile();
        return this.databaseCollection.listDeletedAgents();
    }
    /** Reads immutable database history. */
    public async listAgentHistory(identifier: string) {
        return this.databaseCollection.listAgentHistory(identifier);
    }
    /** Reads immutable database history snapshots. */
    public async listAgentHistorySnapshots(identifier: string) {
        return this.databaseCollection.listAgentHistorySnapshots(identifier);
    }
    /** Restores a historical source through the same file/commit workflow. */
    public async restoreAgentFromHistory(historyId: number, expectedPermanentId?: string): Promise<void> {
        const result = await this.client
            .from(`${this.options.tablePrefix}AgentHistory`)
            .select('permanentId,agentSource')
            .eq('id', historyId)
            .single();
        if (result.error || !result.data || (expectedPermanentId && result.data.permanentId !== expectedPermanentId))
            throw new NotFoundError('The history snapshot does not belong to this agent.');
        const identifier = String(result.data.permanentId);
        await this.updateAgentSource(identifier, result.data.agentSource as string_book, {
            expectedSource: await this.getAgentSource(identifier),
        });
    }

    /**
     * Adapts existing authorized organization actions at the provider boundary. One logical action becomes one commit.
     * Ownership/accounts remain operational. A rejected action rolls back derived organization instead of editing files.
     */
    public async mutateOrganization<Result>(operation: () => Promise<Result>): Promise<Result> {
        return withWorkspaceMutation(this.workspace, async () => {
            this.assertMutationSafe();
            if (ORGANIZATION_CONTEXT.getStore()) return operation();
            await this.reconcile();
            const manifest = await this.currentManifest();
            const previousAgents = await this.loadOrganizationAgents();
            const previousFolders = await this.loadFolders();
            const context = {
                record: {
                    id: randomUUID(),
                    message: 'Update agent organization',
                    status: 'prepared',
                    files: [],
                } as WorkspaceMutationRecord,
                manifest,
            };
            try {
                const result = await ORGANIZATION_CONTEXT.run(context, operation);
                if (result instanceof Response && !result.ok) {
                    if (context.record.files.length)
                        throw new ConflictError(
                            'The operation was rejected after a source save. Review its recorded recovery state before retrying.',
                        );
                    await this.restoreOrganization(previousAgents, previousFolders);
                    return result;
                }
                const agents = await this.loadOrganizationAgents();
                const folders = await this.loadFolders();
                const files: Array<{ path: string; before: string | null; after: string | null }> = [];
                const entries = await Promise.all(
                    context.manifest.agents.map(async (entry) => {
                        const row = agents.find((agent) => agent.permanentId === entry.id);
                        if (!row) return entry;
                        const isDeleted = Boolean(row.deletedAt);
                        const path = `${this.folderPath(row.folderId, folders, true)}/${basename(entry.path)}`;
                        if (isDeleted !== Boolean(entry.isDeleted) || (!isDeleted && path !== entry.path)) {
                            const before = await readWorkspaceAgentFile(this.workspace.projectPath, entry.path);
                            if (before !== null) files.push({ path: entry.path, before, after: null });
                            if (!isDeleted) {
                                const source = before ?? row.agentSource;
                                await this.assertNewPath(path);
                                files.push({ path, before: null, after: source });
                            }
                        }
                        return { ...entry, path, isDeleted, sortOrder: row.sortOrder ?? 0 };
                    }),
                );
                // Earlier nested source changes belong to this same logical operation and the same journal/commit.
                const allFiles = new Map(context.record.files.map((file) => [file.path, file]));
                for (const file of files) {
                    const old = allFiles.get(file.path);
                    allFiles.set(file.path, { ...file, before: old ? old.before : file.before });
                }
                await this.saveOperation(
                    'Update agent organization',
                    [...allFiles.values()],
                    { version: 1, agents: entries, folders },
                    context.record,
                );
                return result;
            } catch (error) {
                // If files have already been saved, the journal owns recovery. Never roll source back over a newer edit.
                await this.restoreOrganization(previousAgents, previousFolders);
                if (context.record.files.length)
                    this.state.writeValue('WorkspaceMutation', context.record.id, {
                        ...context.record,
                        status: 'failed',
                        reason: error instanceof Error ? error.message : String(error),
                    });
                await this.reconcile();
                throw error;
            }
        });
    }

    /** Reconciles interrupted writes and existing commits under repository ownership, without duplicate commits. */
    public async recoverMutations(isFailedRecoveryRequested = false): Promise<void> {
        await withWorkspaceMutation(this.workspace, async () => {
            for (const record of this.state.readValues<WorkspaceMutationRecord>('WorkspaceMutation')) {
                if (record.status === 'committed') continue;
                const marker = `[workspace-operation:${record.id}]`;
                const commit = await executeWorkspaceGit(this.workspace.repositoryRoot!, [
                    'log',
                    '--format=%H',
                    '--fixed-strings',
                    `--grep=${marker}`,
                    '-1',
                ]).catch(() => '');
                if (commit) {
                    this.state.writeValue('WorkspaceMutation', record.id, { ...record, status: 'committed', commit });
                    continue;
                }
                if (record.status === 'failed' && !isFailedRecoveryRequested) continue;
                try {
                    for (const file of record.files) {
                        const current = await readWorkspaceAgentFile(this.workspace.projectPath, file.path);
                        if (current === file.after) continue;
                        if (current !== file.before)
                            throw new ConflictError(
                                `Interrupted save overlaps external changes in \`${file.path}\`. Recover this operation manually.`,
                            );
                        await writeWorkspaceAgentFile(this.workspace.projectPath, file.path, file.before, file.after);
                    }
                    await this.synchronizeFolderDirectories(record);
                    await this.commitOperation({ ...record, status: 'saved' });
                } catch (error) {
                    this.state.writeValue('WorkspaceMutation', record.id, {
                        ...record,
                        status: 'failed',
                        reason: error instanceof Error ? error.message : String(error),
                    });
                }
            }
            await this.reconcile();
        });
    }

    /** Finds cached file identity, including tombstones. */
    private findEntry(identifier: string): WorkspaceAgentFile | undefined {
        const pending = ORGANIZATION_CONTEXT.getStore()?.manifest.agents.find(
            (entry) => entry.id === identifier || entry.name === identifier,
        );
        if (pending) return pending;
        return this.state
            .readValues<WorkspaceAgentFile>('WorkspaceAgentFile')
            .find((entry) => entry.id === identifier || entry.name === identifier);
    }

    /** Rebuilds the derived application rows, preserving stable identities on external moves. */
    private async reconcileFiles(): Promise<void> {
        const manifest = await this.readManifest();
        const previous = this.state.readValues<WorkspaceAgentFile>('WorkspaceAgentFile');
        const discovered = await discoverWorkspaceAgentFiles(this.workspace.projectPath);
        const observedIds = new Set<string>();
        const discoveredPaths = new Set(discovered.map((file) => file.path));
        const observation = this.state.readValues<WorkspaceAgentObservation>('WorkspaceObservation')[0];
        const head = await executeWorkspaceGit(this.workspace.repositoryRoot!, ['rev-parse', 'HEAD']).catch(() => '');
        const renamedPaths = new Map<string, string>();
        if (observation?.head && head && observation.head !== head) {
            const changes = await executeWorkspaceGit(this.workspace.repositoryRoot!, [
                'diff',
                '--name-status',
                '-z',
                '--find-renames=20%',
                observation.head,
                head,
                '--',
                repositoryAgentPath(this.workspace.repositoryRoot!, this.workspace.projectPath, 'agents'),
            ]).catch(() => '');
            const parts = changes.split('\0');
            for (let index = 0; index < parts.length && parts[index]; ) {
                const status = parts[index++]!;
                const before = parts[index++]!;
                if (!status.startsWith('R')) continue;
                const after = parts[index++]!;
                const projectPrefix = relative(this.workspace.repositoryRoot!, this.workspace.projectPath).replace(
                    /\\/gu,
                    '/',
                );
                const prefix = projectPrefix ? projectPrefix + '/' : '';
                if (before.startsWith(prefix + 'agents/') && after.startsWith(prefix + 'agents/'))
                    renamedPaths.set(after.slice(prefix.length), before.slice(prefix.length));
            }
        }
        const observedFiles: Array<{ id: string; identity: string; path: string }> = [];
        let isChanged = false;
        // Preserve derived ids for external directories as well as versioned empty folders.
        const folders = [
            ...manifest.folders,
            ...(await this.loadFolders()).filter((folder) => !manifest.folders.some((entry) => entry.id === folder.id)),
        ];
        for (const file of discovered) {
            const information = file.error
                ? null
                : await lstat(await resolveConfinedAgentPath(this.workspace.projectPath, file.path));
            const identity = information?.ino ? `${information.dev}:${information.ino}` : '';
            const moved = observation?.files.find(
                (entry) =>
                    !discoveredPaths.has(entry.path) &&
                    !observedIds.has(entry.id) &&
                    ((identity && entry.identity === identity) || renamedPaths.get(file.path) === entry.path),
            );
            const recorded = manifest.agents.find((entry) => entry.path === file.path && !entry.isDeleted);
            const cached =
                previous.find((entry) => entry.path === file.path && !entry.isDeleted) ??
                previous.find((entry) => entry.id === moved?.id && !entry.isDeleted) ??
                [...previous, ...manifest.agents].find(
                    (entry) =>
                        !entry.isDeleted &&
                        !discoveredPaths.has(entry.path) &&
                        entry.hash === file.hash &&
                        !observedIds.has(entry.id),
                );
            const id =
                recorded?.id ??
                cached?.id ??
                (file.source && parseAgentSource(file.source).permanentId) ??
                $randomBase58(14);
            const entry: WorkspaceAgentFile = {
                id,
                path: file.path,
                name: file.name,
                hash: file.hash,
                sortOrder: recorded?.sortOrder ?? cached?.sortOrder ?? 0,
                error: file.error,
            };
            observedIds.add(id);
            observedFiles.push({ id, identity, path: file.path });
            const oldEntry = previous.find((candidate) => candidate.id === id);
            const folderId = this.ensureFolderPath(dirname(file.path), folders);
            const row = await this.client
                .from(`${this.options.tablePrefix}Agent`)
                .select('permanentId,agentHash,agentSource,deletedAt')
                .eq('permanentId', id)
                .maybeSingle();
            if (row.error) throw new NotAllowed(row.error.message);
            if (file.source && !entry.error) {
                if (!row.data) {
                    await this.databaseCollection.createAgent(`${file.source}\nMETA ID ${id}\n` as string_book, {
                        folderId,
                        sortOrder: entry.sortOrder,
                    });
                } else if (row.data.agentSource !== file.source) {
                    await this.databaseCollection.updateAgentSource(id, file.source);
                }
                const profile = parseAgentSource(file.source);
                const update = await this.client
                    .from(`${this.options.tablePrefix}Agent`)
                    .update({
                        agentName: profile.agentName,
                        agentHash: profile.agentHash,
                        agentSource: file.source,
                        agentProfile: profile,
                        deletedAt: null,
                        folderId,
                        sortOrder: entry.sortOrder,
                        visibility: profile.meta.visibility ?? 'PUBLIC',
                        promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
                    })
                    .eq('permanentId', id);
                if (update.error) throw new NotAllowed(update.error.message);
            } else if (row.data && !row.data.deletedAt) {
                await this.databaseCollection.deleteAgent(id);
            }
            this.state.writeValue('WorkspaceAgentFile', id, entry);
            isChanged ||= JSON.stringify(oldEntry) !== JSON.stringify(entry);
        }
        for (const entry of [...manifest.agents, ...previous]) {
            if (observedIds.has(entry.id)) continue;
            observedIds.add(entry.id);
            const existing = await this.client
                .from(`${this.options.tablePrefix}Agent`)
                .select('permanentId')
                .eq('permanentId', entry.id)
                .maybeSingle();
            if (existing.data) await this.databaseCollection.deleteAgent(entry.id);
            this.state.writeValue('WorkspaceAgentFile', entry.id, { ...entry, isDeleted: true });
            isChanged ||= !entry.isDeleted;
        }
        for (const folder of folders) {
            const result = await this.client.from(`${this.options.tablePrefix}AgentFolder`).upsert(
                {
                    id: folder.id,
                    name: folder.name,
                    parentId: folder.parentId,
                    sortOrder: folder.sortOrder,
                    icon: folder.icon ?? null,
                    color: folder.color ?? null,
                    deletedAt: folder.isDeleted ? new Date().toISOString() : null,
                },
                { onConflict: 'id' },
            );
            if (result.error) throw new NotAllowed(result.error.message);
        }
        this.state.writeValue('WorkspaceObservation', 'agents', { head, files: observedFiles });
        if (isChanged) this.onDefinitionsChanged();
    }

    /** Reads and validates only versioned logical data; no account ids or secrets are stored here. */
    private async readManifest(): Promise<WorkspaceAgentsManifest> {
        const content = await readWorkspaceAgentFile(this.workspace.projectPath, WORKSPACE_AGENTS_MANIFEST);
        if (!content) return { version: 1, agents: [], folders: [] };
        const manifest = JSON.parse(content) as WorkspaceAgentsManifest;
        if (manifest.version !== 1 || !Array.isArray(manifest.agents) || !Array.isArray(manifest.folders))
            throw new NotAllowed(
                'Invalid agents/.promptbook.json. Restore or repair the versioned organization manifest.',
            );
        const ids = new Set<string>();
        for (const entry of manifest.agents) {
            if (!/^[A-Za-z0-9]+$/u.test(entry.id) || ids.has(entry.id))
                throw new ConflictError('Duplicate or invalid workspace agent identity.');
            ids.add(entry.id);
            await resolveConfinedAgentPath(this.workspace.projectPath, entry.path);
        }
        for (const folder of manifest.folders) this.folderPath(folder.id, manifest.folders, true);
        return manifest;
    }

    /** Captures current identities, including file additions observed since the last versioned mutation. */
    private async currentManifest(): Promise<WorkspaceAgentsManifest> {
        const pending = ORGANIZATION_CONTEXT.getStore()?.manifest;
        if (pending) return pending;
        return {
            version: 1,
            agents: this.state.readValues<WorkspaceAgentFile>('WorkspaceAgentFile').map(({ error, ...entry }) => entry),
            folders: await this.loadFolders(),
        };
    }

    /** Loads derived folders for the shared organization adapter. */
    private async loadFolders(): Promise<WorkspaceFolder[]> {
        const result = await this.client
            .from(`${this.options.tablePrefix}AgentFolder`)
            .select('id,name,parentId,sortOrder,icon,color,deletedAt');
        if (result.error) throw new NotAllowed(result.error.message);
        return (result.data ?? []).map((row) => ({
            id: Number(row.id),
            name: String(row.name),
            parentId: row.parentId == null ? null : Number(row.parentId),
            sortOrder: Number(row.sortOrder ?? 0),
            icon: row.icon,
            color: row.color,
            isDeleted: Boolean(row.deletedAt),
        }));
    }

    /** Loads derived agent organization without including operational accounts in the manifest. */
    private async loadOrganizationAgents(): Promise<OrganizationAgentRow[]> {
        const result = await this.client
            .from(`${this.options.tablePrefix}Agent`)
            .select('permanentId,agentName,agentSource,folderId,sortOrder,deletedAt');
        if (result.error) throw new NotAllowed(result.error.message);
        return result.data as OrganizationAgentRow[];
    }

    /** Restores derived organization following an action which rejected its mutation before source changes. */
    private async restoreOrganization(agents: OrganizationAgentRow[], folders: WorkspaceFolder[]): Promise<void> {
        for (const row of agents)
            await this.client
                .from(`${this.options.tablePrefix}Agent`)
                .update({ folderId: row.folderId, sortOrder: row.sortOrder, deletedAt: row.deletedAt })
                .eq('permanentId', row.permanentId);
        const currentFolders = await this.loadFolders();
        for (const folder of currentFolders.filter((candidate) => !folders.some((old) => old.id === candidate.id)))
            await this.client.from(`${this.options.tablePrefix}AgentFolder`).delete().eq('id', folder.id);
        for (const { isDeleted, ...folder } of folders)
            await this.client
                .from(`${this.options.tablePrefix}AgentFolder`)
                .update({ ...folder, deletedAt: isDeleted ? new Date().toISOString() : null })
                .eq('id', folder.id);
    }

    /** Resolves and validates a folder path while detecting loops, missing parents and portable-name collisions. */
    private folderPath(
        folderId: number | null,
        folders: ReadonlyArray<WorkspaceFolder>,
        isDeletedAllowed = false,
    ): string {
        const names: string[] = [];
        const visited = new Set<number>();
        while (folderId !== null) {
            const folder = folders.find((candidate) => candidate.id === folderId);
            if (!folder || visited.has(folderId) || (!isDeletedAllowed && folder.isDeleted))
                throw new ConflictError('Folder is missing, deleted or has a parent cycle.');
            if (
                !folder.name ||
                /[\\/\x00-\x1f<>:"|?*]/u.test(folder.name) ||
                folder.name === '.' ||
                folder.name === '..' ||
                /[. ]$/u.test(folder.name)
            )
                throw new NotAllowed('Folder names must be portable directory names.');
            if (
                folders.some(
                    (candidate) =>
                        candidate.id !== folder.id &&
                        !candidate.isDeleted &&
                        candidate.parentId === folder.parentId &&
                        candidate.name.toLowerCase() === folder.name.toLowerCase(),
                )
            )
                throw new ConflictError('Folder names collide by letter case.');
            visited.add(folderId);
            names.unshift(folder.name);
            folderId = folder.parentId;
        }
        return ['agents', ...names].join('/');
    }

    /** Maps existing directories to logical folders, preserving ids already in the manifest. */
    private ensureFolderPath(path: string, folders: WorkspaceFolder[]): number | null {
        let parentId: number | null = null;
        for (const name of path.split('/').slice(1)) {
            let folder = folders.find((candidate) => candidate.parentId === parentId && candidate.name === name);
            if (!folder) {
                folder = {
                    id: Math.max(0, ...folders.map((candidate) => candidate.id)) + 1,
                    name,
                    parentId,
                    sortOrder: 0,
                };
                folders.push(folder);
            }
            parentId = folder.id;
        }
        return parentId;
    }

    /** Checks both path occupancy and parsed-name collisions before creating a source. */
    private async assertNewPath(path: string): Promise<void> {
        if ((await readWorkspaceAgentFile(this.workspace.projectPath, path)) !== null)
            throw new ConflictError(`Book path \`${path}\` is already occupied.`);
    }

    /** Rejects a collision before any source/history mutation rather than hiding both definitions afterwards. */
    private assertUniqueAgentName(name: string, manifest: WorkspaceAgentsManifest, exceptId?: string): void {
        if (
            manifest.agents.some(
                (entry) => entry.id !== exceptId && !entry.isDeleted && entry.name.toLowerCase() === name.toLowerCase(),
            )
        )
            throw new ConflictError(`Agent name \`${name}\` is already in use. Choose another title.`);
    }

    /** Unsafe integration affects mutations, while the authenticated app and read-only chats remain available. */
    private assertMutationSafe(): void {
        const control = this.state.getControl();
        if (control.synchronization === 'blocked')
            throw new ConflictError(
                `Repository synchronization needs recovery before another mutation: ${
                    control.reason ?? 'inspect the project execution view'
                }`,
            );
    }

    /** Serializes derived reconciliation across the CLI and web process without blocking independent execution sessions. */
    private async withReconciliationLease<Result>(operation: () => Promise<Result>): Promise<Result> {
        const lockPath = join(this.workspace.projectPath, '.promptbook', 'agent-reconciliation.lock');
        let release: (() => Promise<void>) | undefined;
        for (let attempt = 0; !release; attempt++) {
            try {
                release = await acquireWorkspaceLease(lockPath);
            } catch (error) {
                if (!(error instanceof ConflictError) || attempt >= 50) throw error;
                await new Promise<void>((done) => setTimeout(done, 100));
            }
        }
        try {
            return await operation();
        } finally {
            await release();
        }
    }

    /** Mirrors empty folders too; only empty obsolete directories are removed, never unrelated files. */
    private async synchronizeFolderDirectories(record: WorkspaceMutationRecord): Promise<void> {
        const manifestFile = record.files.find((file) => file.path === WORKSPACE_AGENTS_MANIFEST);
        if (!manifestFile?.after) return;
        const manifest = JSON.parse(manifestFile.after) as WorkspaceAgentsManifest;
        for (const folder of manifest.folders.filter((candidate) => !candidate.isDeleted)) {
            const probePath = await resolveConfinedAgentPath(
                this.workspace.projectPath,
                `${this.folderPath(folder.id, manifest.folders)}/.probe`,
            );
            await mkdir(dirname(probePath), { recursive: true });
        }
        const previous = manifestFile.before ? (JSON.parse(manifestFile.before) as WorkspaceAgentsManifest) : undefined;
        const activePaths = new Set(
            manifest.folders
                .filter((folder) => !folder.isDeleted)
                .map((folder) => this.folderPath(folder.id, manifest.folders)),
        );
        for (const folder of [...(previous?.folders ?? [])].reverse()) {
            const path = this.folderPath(folder.id, previous!.folders, true);
            if (activePaths.has(path)) continue;
            const probePath = await resolveConfinedAgentPath(this.workspace.projectPath, `${path}/.probe`);
            await rmdir(dirname(probePath)).catch((error: NodeJS.ErrnoException) => {
                if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error.code ?? '')) throw error;
            });
        }
    }

    /** Saves a recoverable logical operation, rejecting unrelated dirty files before the first write. */
    private async saveOperation(
        message: string,
        files: WorkspaceMutationRecord['files'],
        manifest: WorkspaceAgentsManifest,
        pendingRecord?: WorkspaceMutationRecord,
    ): Promise<void> {
        this.assertMutationSafe();
        for (const folder of manifest.folders)
            await resolveConfinedAgentPath(
                this.workspace.projectPath,
                `${this.folderPath(folder.id, manifest.folders, true)}/.probe`,
            );
        const beforeManifest = await readWorkspaceAgentFile(this.workspace.projectPath, WORKSPACE_AGENTS_MANIFEST);
        const afterManifest = `${JSON.stringify(manifest, null, 4)}\n`;
        const context = ORGANIZATION_CONTEXT.getStore();
        const ownedBefore = new Map(
            (context?.record ?? pendingRecord)?.files.map((file) => [file.path, file.after]) ?? [],
        );
        const changedFiles = [
            ...files,
            ...(context ? [] : [{ path: WORKSPACE_AGENTS_MANIFEST, before: beforeManifest, after: afterManifest }]),
        ].filter((file) => file.before !== file.after);
        if (!changedFiles.length) return;
        const dirty = await listWorkingTreeChangedFiles(this.workspace.repositoryRoot!);
        for (const file of changedFiles) {
            const path = repositoryAgentPath(this.workspace.repositoryRoot!, this.workspace.projectPath, file.path);
            const owned = (context?.record ?? pendingRecord)?.files.find((candidate) => candidate.path === file.path);
            if (dirty.includes(path) && !owned)
                throw new ConflictError(
                    `\`${file.path}\` contains uncommitted local work. Commit it or resolve it before saving through the server.`,
                );
        }
        const accumulated = new Map((context?.record.files ?? []).map((file) => [file.path, file]));
        for (const file of changedFiles) {
            const previous = accumulated.get(file.path);
            accumulated.set(file.path, { ...file, before: previous ? previous.before : file.before });
        }
        const record: WorkspaceMutationRecord = {
            id: context?.record.id ?? pendingRecord?.id ?? randomUUID(),
            message,
            status: 'prepared',
            files: [...accumulated.values()],
        };
        if (context) {
            context.record = record;
            context.manifest = manifest;
        }
        this.state.writeValue('WorkspaceMutation', record.id, record);
        try {
            for (const file of changedFiles) {
                const current = await readWorkspaceAgentFile(this.workspace.projectPath, file.path);
                if (current === file.after) continue;
                const expected = ownedBefore.has(file.path) ? ownedBefore.get(file.path)! : file.before;
                await writeWorkspaceAgentFile(this.workspace.projectPath, file.path, expected, file.after);
            }
            if (context) return;
            await this.synchronizeFolderDirectories(record);
            this.state.writeValue('WorkspaceMutation', record.id, { ...record, status: 'saved' });
            await this.reconcile();
            await this.commitOperation({ ...record, status: 'saved' });
        } catch (error) {
            this.state.writeValue('WorkspaceMutation', record.id, {
                ...record,
                status: 'failed',
                reason: error instanceof Error ? error.message : String(error),
            });
            throw new ConflictError(
                spaceTrim(`
                Agent mutation could not be fully committed. Local source is retained; inspect the execution view's recovery record.
                ${error instanceof Error ? error.message : String(error)}
            `),
            );
        }
    }

    /** Commits only the recorded paths and records push separately from source persistence. */
    private async commitOperation(record: WorkspaceMutationRecord): Promise<void> {
        for (const file of record.files) {
            if ((await readWorkspaceAgentFile(this.workspace.projectPath, file.path)) !== file.after)
                throw new ConflictError(
                    `\`${file.path}\` changed after saving. The commit is deferred for recovery; the newer content was preserved.`,
                );
        }
        const paths = record.files.map((file) =>
            repositoryAgentPath(this.workspace.repositoryRoot!, this.workspace.projectPath, file.path),
        );
        const changed = await executeWorkspaceGit(this.workspace.repositoryRoot!, [
            'diff',
            'HEAD',
            '--',
            ...paths,
        ]).catch(() => 'unborn');
        const untracked = await executeWorkspaceGit(this.workspace.repositoryRoot!, [
            'ls-files',
            '--others',
            '--exclude-standard',
            '--',
            ...paths,
        ]);
        if (changed || untracked)
            await commitChanges(`${record.message}\n\n[workspace-operation:${record.id}]`, {
                projectPath: this.workspace.repositoryRoot,
                relevantPaths: paths,
                autoPush: false,
                environment: this.environment,
            });
        const commit = await executeWorkspaceGit(this.workspace.repositoryRoot!, ['rev-parse', 'HEAD']);
        if (this.state.getControl().synchronization !== 'local-only')
            this.state.updateControl({
                synchronization: 'push-pending',
                reason: 'Local source commit awaits synchronization.',
                isCommitSynchronizationRequested: true,
            });
        this.state.writeValue('WorkspaceMutation', record.id, { ...record, status: 'committed', commit });
        if (this.state.getControl().synchronization !== 'local-only')
            this.state.updateControl({ synchronization: 'push-pending' });
    }
}

// Note: [🟡] Workspace collection is only published in `@promptbook/cli`.
