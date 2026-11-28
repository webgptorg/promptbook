import { spaceTrim } from 'spacetrim';
import { isAbsolute, relative, resolve } from 'path';
import type { CoderCheckOutcome } from '../checks/CoderCheckOutcome';
import type { CoderCommitScope } from './coderCommitScope';
import { CoderGitOperationError } from './CoderGitOperationError';
import { buildCoderCheckCommitMessage } from './buildCoderCheckCommitMessage';
import { commitChanges, pushCommittedChanges } from './commitChanges';
import { CoderPhaseRecovery } from './CoderPhaseRecovery';
import { buildAgentGitEnv } from './agentGitIdentity';
import {
    assertCoderRegularWriterPath,
    buildCoderFinalizationSnapshot,
    publishCoderFinalizationFiles,
    type CoderFinalizationFile,
} from './coderFinalizationFiles';
import {
    applyCoderRepositoryView,
    assertLiveCheckBoundary,
    createCoderRepositoryView,
    removeCoderRepositoryView,
    retainCoderRepositoryViewSnapshot,
} from './coderRepositoryView';
import {
    areCoderFileHashesEqual,
    assertCoderDeltaIsOwned,
    captureCoderRepositorySnapshot,
    captureCoderIgnoredFileHashes,
    getCoderProtectedPaths,
    listCoderTreeDelta,
    readCoderTree,
    type CoderRepositorySnapshot,
    type CoderTreeEntry,
} from './coderRepositorySnapshot';

/** Durable provenance of a locally persisted phase; Git failures never retry implementation. */
export type CoderPhaseCommitResult = {
    readonly phase: 'implementation' | 'repair' | 'checks' | 'finalization';
    readonly paths: ReadonlyArray<string>;
    readonly commit?: string;
    readonly checkOutcome?: CoderCheckOutcome['kind'];
    readonly attempt?: number;
};

/** Repository and selected-project policy, passed explicitly by finite run, server and check repair. */
export type CoderPhasePersistenceOptions = {
    readonly scope: CoderCommitScope;
    readonly isCommitEnabled: boolean;
    readonly isAutoPushEnabled: boolean;
    readonly implementationMessage?: string;
    readonly task?: string;
    readonly excludedPaths?: ReadonlyArray<string>;
    readonly signal?: AbortSignal;
    readonly onPersisted?: (result: CoderPhaseCommitResult) => void;
    /** Carries exact uncommitted ownership through the same finite/server/repair job. */
    readonly onRetained?: (scope: CoderCommitScope) => void;
    /** Existing interactive commit confirmation runs before the first actual phase commit. */
    readonly beforePersist?: () => Promise<void>;
};

/**
 * Serializes phase ownership and persists captured versions, never the dirty filenames at finalization.
 * The caller holds the shared workspace lease. Boundary checks detect edits outside owned activity, HEAD/index
 * drift and collisions with pre-existing user content; ambiguity stops persistence with all bytes retained.
 */
export class CoderPhasePersistence {
    public readonly commits: CoderPhaseCommitResult[] = [];
    private boundary: CoderRepositorySnapshot;
    private persistedBoundary: CoderRepositorySnapshot;
    private isMutationActive = false;
    private isCommitConfirmationCompleted = false;
    private readonly operation: CoderRepositorySnapshot;
    private implementationBoundary?: CoderRepositorySnapshot;
    private readonly recovery: CoderPhaseRecovery;
    private readonly excludedPaths: Set<string>;
    private readonly ownedPaths = new Set<string>();
    private persistenceHead?: string;
    private persistenceIndex: ReadonlyMap<string, CoderTreeEntry>;
    private persistenceIndexFlags: ReadonlyMap<string, string>;

    /** Starts before implementation (or repair PRD creation), while holding workspace ownership. */
    public constructor(private readonly options: CoderPhasePersistenceOptions) {
        if (!options.scope.repositorySnapshot) {
            throw new CoderGitOperationError(
                'record',
                'Phase persistence requires an operation content/index snapshot before implementation.',
            );
        }
        const excludedPaths = new Set(options.excludedPaths);
        this.excludedPaths = excludedPaths;
        for (const path of excludedPaths) this.ownedPaths.add(path);
        this.operation = options.scope.ownershipSnapshot ?? options.scope.repositorySnapshot;
        this.boundary = {
            ...options.scope.repositorySnapshot,
            entries: new Map(
                [...options.scope.repositorySnapshot.entries].filter(([path]) => !excludedPaths.has(path)),
            ),
            workingFileHashes: new Map(
                [...options.scope.repositorySnapshot.workingFileHashes].filter(([path]) => !excludedPaths.has(path)),
            ),
        };
        this.persistedBoundary = this.boundary;
        this.persistenceHead = options.scope.repositorySnapshot.head;
        this.persistenceIndex = options.scope.repositorySnapshot.indexEntries;
        this.persistenceIndexFlags = options.scope.repositorySnapshot.indexFlags;
        this.recovery = new CoderPhaseRecovery(options.scope);
    }

    /** Adopts repair authoring/Book setup performed by the same lease owner since its pre-authoring scope. */
    public async adoptPreparation(): Promise<void> {
        return this.withOwnership(async () => {
            const prepared = await this.capture();
            if (prepared.head !== this.boundary.head)
                throw new CoderGitOperationError(
                    'record',
                    'HEAD changed during repair preparation; existing work was retained.',
                );
            const headEntries = this.operation.head
                ? await readCoderTree(this.operation.repositoryRoot, this.operation.head)
                : new Map();
            assertCoderDeltaIsOwned(
                this.operation,
                listCoderTreeDelta(this.operation.entries, prepared.entries),
                headEntries,
            );
            for (const path of listCoderTreeDelta(this.operation.entries, prepared.entries)) this.ownedPaths.add(path);
            await this.recovery.initialize(this.operation);
            this.boundary = prepared;
        });
    }

    /** Captures a quiescent content/index boundary in the execution checkout, including nested projects. */
    private capture(): Promise<CoderRepositorySnapshot> {
        return captureCoderRepositorySnapshot(this.operation.repositoryRoot, [...this.excludedPaths]);
    }

    /** Detects unexpected writers before handing ownership to another subprocess or status writer. */
    public async assertRetained(): Promise<void> {
        return this.withOwnership(() => this.assertRetainedContent());
    }

    /** Refuses known Coder status/artifact writes before they can overwrite pre-existing user content. */
    public async assertWritablePaths(absolutePaths: ReadonlyArray<string>): Promise<void> {
        return this.withOwnership(async () => {
            await this.assertRetainedContent();
            const paths = absolutePaths
                .map((path) =>
                    relative(this.operation.repositoryRoot, resolve(this.options.scope.projectPath, path)).replace(
                        /\\/gu,
                        '/',
                    ),
                )
                .filter((path) => !isAbsolute(path) && path !== '..' && !path.startsWith('../'));
            const headEntries = this.operation.head
                ? await readCoderTree(this.operation.repositoryRoot, this.operation.head)
                : new Map();
            assertCoderDeltaIsOwned(this.operation, paths, headEntries);
            for (const path of paths)
                await assertCoderRegularWriterPath(
                    this.operation.repositoryRoot,
                    resolve(this.operation.repositoryRoot, path),
                );
            for (const path of paths) this.ownedPaths.add(path);
        });
    }

    /** Performs boundary validation within an already owned serialized activity. */
    private async assertRetainedContent(): Promise<void> {
        const current = await this.capture();
        if (
            current.head !== this.boundary.head ||
            current.indexFingerprint !== this.boundary.indexFingerprint ||
            !areCoderFileHashesEqual(current.workingFileHashes, this.boundary.workingFileHashes)
        )
            throw new CoderGitOperationError(
                'record',
                'Unexpected concurrent repository edits between owned phases. No further agent/check/persistence activity was started; inspect the retained work.',
            );
        await this.recovery.initialize(this.operation);
    }

    /** Owns one agent, check or Coder bookkeeping mutation, and waits for all of its writes before snapshotting. */
    public async mutate<T>(
        operation: () => Promise<T>,
        phase: CoderPhaseCommitResult['phase'] = 'implementation',
    ): Promise<T> {
        return this.withOwnership(async () => {
            await this.assertRetainedContent();
            let result:
                | { readonly kind: 'returned'; readonly value: T }
                | { readonly kind: 'threw'; readonly error: unknown };
            try {
                result = { kind: 'returned', value: await operation() };
            } catch (error) {
                result = { kind: 'threw', error };
            }
            await this.captureOwnedMutationBoundary(phase);
            if (result.kind === 'threw') throw result.error;
            return result.value;
        });
    }

    /**
     * Owns a check's private content view instead of assuming every live edit during its runtime belongs to it.
     * Execution returns a typed real outcome; boundary/import/persistence errors bypass the repair retry loop.
     */
    public async mutateCheck(execute: (projectPath: string) => Promise<CoderCheckOutcome>): Promise<CoderCheckOutcome> {
        return this.withOwnership(async () => {
            await this.assertRetainedContent();
            const retained = this.boundary;
            const excludedPaths = [...this.excludedPaths];
            const view = await createCoderRepositoryView(retained, this.options.scope.projectPath, excludedPaths);
            let outcome: CoderCheckOutcome | undefined;
            try {
                await assertLiveCheckBoundary(retained, excludedPaths, view.beforeIgnoredFileHashes);
                outcome = await execute(view.projectPath);
                const after = await captureCoderRepositorySnapshot(view.repositoryRoot, excludedPaths);
                const afterIgnoredFileHashes = await captureCoderIgnoredFileHashes(view.repositoryRoot, excludedPaths);
                await retainCoderRepositoryViewSnapshot(view, after, this.operation.repositoryRoot);
                await this.recovery.record(
                    { ...after, repositoryRoot: this.operation.repositoryRoot },
                    `private-check-${outcome.kind}`,
                    {
                        viewPath: view.directory,
                        checkOutcome: outcome.kind,
                        output: outcome.output,
                        ignoredFileHashes: [...afterIgnoredFileHashes],
                    },
                );
                await applyCoderRepositoryView(
                    view,
                    after,
                    this.operation,
                    retained,
                    excludedPaths,
                    afterIgnoredFileHashes,
                );
                await this.captureOwnedMutationBoundary('checks');
                if (outcome.kind !== 'interrupted')
                    await removeCoderRepositoryView(view, this.operation.repositoryRoot);
                return outcome;
            } catch (error) {
                const failure = new CoderGitOperationError(
                    'record',
                    spaceTrim(`
                    Check content could not be safely imported. Live files and the private result were retained.
                    Private check result: \`${view.directory}\`.
                    ${error instanceof Error ? error.message : String(error)}
                `),
                );
                failure.checkOutcome = outcome?.kind;
                throw failure;
            }
        });
    }

    /** Retains partial activity output before validating ownership, even when the owned subprocess failed. */
    private async captureOwnedMutationBoundary(phase: CoderPhaseCommitResult['phase']): Promise<void> {
        const after = await this.capture();
        await this.recovery.record(after, `owned-${phase}`);
        if (after.head !== this.boundary.head)
            throw new CoderGitOperationError(
                'record',
                'HEAD changed during an owned execution phase. Inspect the existing commits; Coder will not guess ownership or repeat the agent.',
            );
        const operationHead = this.operation.head
            ? await readCoderTree(this.operation.repositoryRoot, this.operation.head)
            : new Map();
        const changedPaths = listCoderTreeDelta(this.boundary.entries, after.entries);
        if (phase === 'finalization') {
            const unexpectedPaths = changedPaths.filter((path) => !this.ownedPaths.has(path));
            if (unexpectedPaths.length || after.indexFingerprint !== this.boundary.indexFingerprint) {
                throw new CoderGitOperationError(
                    'record',
                    `Unexpected edits during Coder bookkeeping${
                        unexpectedPaths.length
                            ? `: ${unexpectedPaths.map((path) => `\`${path}\``).join(', ')}`
                            : ' in the Git index'
                    }. They were retained and will not be attributed to status/normalization writes.`,
                );
            }
        }
        try {
            assertCoderDeltaIsOwned(this.operation, changedPaths, operationHead);
        } catch (error) {
            throw new CoderGitOperationError(
                'record',
                `${
                    error instanceof Error ? error.message : String(error)
                }\nOriginal raw bytes/index and the phase result: \`${this.recovery.path}\`.`,
            );
        }
        const protectedPaths = getCoderProtectedPaths(this.operation, operationHead);
        if (
            listCoderTreeDelta(this.boundary.indexEntries, after.indexEntries).some((path) =>
                protectedPaths.has(path),
            ) ||
            [...protectedPaths].some((path) => this.boundary.indexFlags.get(path) !== after.indexFlags.get(path))
        ) {
            throw new CoderGitOperationError(
                'record',
                'A phase changed pre-existing user staging entries. The mixed index and working files were retained; separate them manually.',
            );
        }
        for (const path of changedPaths) this.ownedPaths.add(path);
        this.boundary = after;
    }

    /** Boundary immediately before a check, after status writes, normalization and the harness have finished. */
    public async beforeCheck(): Promise<CoderRepositorySnapshot> {
        return this.withOwnership(async () => {
            await this.assertRetainedContent();
            await this.recovery.record(this.boundary, 'before-check');
            return this.boundary;
        });
    }

    /** Freezes the harness-authored version before Coder normalization/status writes and the check command. */
    public freezeImplementation(): void {
        if (this.isMutationActive)
            throw new CoderGitOperationError(
                'record',
                'Cannot freeze an implementation while an owned repository activity is still running.',
            );
        this.implementationBoundary = this.boundary;
    }

    /** Includes known execution artifacts in Coder finalization, rather than attributing wrapper/log writes to checks. */
    public async includeDurableArtifacts(paths: ReadonlyArray<string> = [...this.excludedPaths]): Promise<void> {
        return this.withOwnership(async () => {
            await this.assertRetainedContent();
            const previousEntries = new Map(this.persistedBoundary.entries);
            const previousHashes = new Map(this.persistedBoundary.workingFileHashes);
            for (const path of paths) {
                if (!this.excludedPaths.has(path)) continue;
                // Previously tracked artifacts have an original version, rather than being fictitious additions.
                const originalEntry = this.options.scope.repositorySnapshot!.entries.get(path);
                const originalHash = this.options.scope.repositorySnapshot!.workingFileHashes.get(path);
                if (originalEntry) previousEntries.set(path, originalEntry);
                if (originalHash) previousHashes.set(path, originalHash);
            }
            this.persistedBoundary = {
                ...this.persistedBoundary,
                entries: previousEntries,
                workingFileHashes: previousHashes,
            };
            for (const path of paths) this.excludedPaths.delete(path);
            this.boundary = await this.capture();
        });
    }

    /** Persists implementation/repair then the command delta, including a completed failing check. */
    public async afterCheck(options: {
        readonly before: CoderRepositorySnapshot;
        readonly phase: 'pre-coding' | 'post-implementation';
        readonly command: string;
        readonly outcome: CoderCheckOutcome;
        readonly attempt?: number;
    }): Promise<ReadonlyArray<CoderPhaseCommitResult>> {
        return this.withOwnership(async () => {
            await this.assertRetainedContent();
            this.persistenceIndex = this.boundary.indexEntries;
            this.persistenceIndexFlags = this.boundary.indexFlags;
            const after = this.boundary;
            await this.recovery.record(after, `after-check-${options.outcome.kind}`);
            if (options.outcome.kind === 'interrupted') return [];
            const results: CoderPhaseCommitResult[] = [];
            if (this.options.implementationMessage) {
                const phase = (options.attempt ?? 1) > 1 ? 'repair' : 'implementation';
                const implementationBoundary = this.implementationBoundary ?? options.before;
                results.push(
                    await this.persist(
                        this.persistedBoundary,
                        implementationBoundary,
                        after,
                        phase,
                        spaceTrim(`
                ${this.options.implementationMessage}

                Coder-Phase: ${phase}
                Coder-Attempt: ${options.attempt ?? 1}
                Coder-Check-Command: ${options.command}
                Coder-Check-Outcome: ${options.outcome.kind}
                Incomplete: task status is pending verified local persistence.
            `),
                        options.outcome.kind,
                        options.attempt,
                    ),
                );
                results.push(
                    await this.persist(
                        implementationBoundary,
                        options.before,
                        after,
                        'finalization',
                        spaceTrim(`
                chore: Prepare Coder check verification

                Coder-Phase: finalization
                Coder-Task: ${this.options.task ?? '(selected task)'}
                Coder-Attempt: ${options.attempt ?? 1}
                Coder-Check-Outcome: ${options.outcome.kind}
                Coder status and selected line-ending normalization before verification; task completion is pending.
            `),
                        options.outcome.kind,
                        options.attempt,
                    ),
                );
            }
            results.push(
                await this.persist(
                    options.before,
                    after,
                    after,
                    'checks',
                    buildCoderCheckCommitMessage({
                        ...options,
                        task: this.options.task,
                    }),
                    options.outcome.kind,
                    options.attempt,
                ),
            );
            this.persistedBoundary = after;
            this.implementationBoundary = undefined;
            await this.refreshIndexBoundary();
            this.options.onRetained?.(this.currentCommitScope);
            return results;
        });
    }

    /** Records only Coder status/trace/normalization writes after genuinely passing checks and phase persistence. */
    public async finalize(message?: string, files?: ReadonlyArray<CoderFinalizationFile>): Promise<void> {
        return this.withOwnership(async () => {
            await this.assertRetainedContent();
            this.assertPersistedPathsAreClean(this.boundary);
            this.persistenceIndex = this.boundary.indexEntries;
            this.persistenceIndexFlags = this.boundary.indexFlags;
            const candidateFiles = files?.map((file) => ({
                ...file,
                path: resolve(this.options.scope.projectPath, file.path),
            }));
            for (const file of candidateFiles ?? [])
                this.ownedPaths.add(relative(this.operation.repositoryRoot, file.path).replace(/\\/gu, '/'));
            const candidate = candidateFiles?.length
                ? await buildCoderFinalizationSnapshot(this.boundary, candidateFiles)
                : this.boundary;
            if (files?.length) await this.recovery.record(candidate, 'completion-candidate');
            // A round with no selected check still uses the same ownership/persistence service. Preserve the
            // harness version before Coder normalization/completion, without inventing a successful check.
            if (this.implementationBoundary && this.options.implementationMessage) {
                await this.persist(
                    this.persistedBoundary,
                    this.implementationBoundary,
                    this.boundary,
                    'implementation',
                    spaceTrim(`
                ${this.options.implementationMessage}

                Coder-Phase: implementation
                ${this.options.task ? `Coder-Task: ${this.options.task}` : ''}
                No project check command was selected.
                Incomplete: task completion is pending local persistence.
            `),
                );
                this.persistedBoundary = this.implementationBoundary;
                this.implementationBoundary = undefined;
                this.assertPersistedPathsAreClean(await this.capture());
            }
            const phase =
                this.options.implementationMessage && this.commits.length === 0 ? 'implementation' : 'finalization';
            await this.persist(
                this.persistedBoundary,
                candidate,
                this.boundary,
                phase,
                message ??
                    spaceTrim(`
            chore: Persist Coder task completion

            Coder-Phase: finalization
            ${this.options.task ? `Coder-Task: ${this.options.task}` : ''}
            ${
                this.commits.some((result) => result.checkOutcome === 'passed')
                    ? 'Selected checks passed; implementation and check transformations are already locally persisted.'
                    : 'No project check command was selected; task completion follows local persistence.'
            }
        `),
            );
            await this.refreshIndexBoundary();
            if (files?.length) {
                await this.assertRetainedContent();
                await publishCoderFinalizationFiles(this.boundary, candidateFiles!);
                await this.captureOwnedMutationBoundary('finalization');
                if (!areCoderFileHashesEqual(this.boundary.workingFileHashes, candidate.workingFileHashes)) {
                    throw new CoderGitOperationError(
                        'record',
                        'The persisted completion candidate could not be published exactly. Local history and partial work were retained; do not rerun the agent.',
                    );
                }
            }
            this.persistedBoundary = this.boundary;
            this.options.onRetained?.(this.currentCommitScope);
        });
    }

    /** Pushes existing local history only; a remote rejection cannot create duplicate commits. */
    public async push(): Promise<void> {
        return this.withOwnership(async () => {
            if (this.options.isCommitEnabled) {
                const current = await this.capture();
                const outstanding = current.dirtyPaths.filter((path) => !this.operation.dirtyPaths.includes(path));
                if (outstanding.length)
                    throw new CoderGitOperationError(
                        'record',
                        spaceTrim(`
                Coder-owned changes remain after local persistence: ${outstanding
                    .map((path) => `\`${path}\``)
                    .join(', ')}.
                A hook, concurrent writer or Git clean filter changed the verified representation. Retain and inspect the work before reporting completion.
            `),
                    );
            }
            if (
                this.options.isCommitEnabled &&
                this.options.isAutoPushEnabled &&
                this.commits.some(({ commit }) => commit)
            ) {
                await this.assertRetainedContent();
                await pushCommittedChanges(this.operation.repositoryRoot, buildAgentGitEnv(), this.options.signal);
            }
        });
    }

    /** Stops completion before publishing done when already persisted raw content is still dirty to Git. */
    private assertPersistedPathsAreClean(snapshot: CoderRepositorySnapshot): void {
        if (!this.options.isCommitEnabled) return;
        const pendingPaths = new Set(listCoderTreeDelta(this.persistedBoundary.entries, snapshot.entries));
        const unexpectedPaths = snapshot.dirtyPaths.filter(
            (path) =>
                !this.operation.dirtyPaths.includes(path) && !pendingPaths.has(path) && !this.excludedPaths.has(path),
        );
        if (unexpectedPaths.length)
            throw new CoderGitOperationError(
                'record',
                spaceTrim(`
            Already persisted content is still changed according to Git: ${unexpectedPaths
                .map((path) => `\`${path}\``)
                .join(', ')}.
            A hook, concurrent writer or Git clean/line-ending filter disagrees with the retained result.
            Task completion was not published. The actual content and local phase commits were retained; do not rerun the agent.
        `),
            );
    }

    /** Reports retained operation-owned changes under no-commit without claiming unrelated user work is clean. */
    public outstandingPaths(): ReadonlyArray<string> {
        return listCoderTreeDelta(this.operation.entries, this.boundary.entries).filter(
            (path) => !this.excludedPaths.has(path) && !this.operation.dirtyPaths.includes(path),
        );
    }

    /** Keeps failure details beside phase trees without overwriting potentially concurrent user artifacts. */
    public async recordFailure(error: unknown): Promise<string | undefined> {
        return this.recovery.recordFailure(error, this.commits);
    }

    /** Original protected user boundary, supplied to the private check view before any result is applied. */
    public get operationSnapshot(): CoderRepositorySnapshot {
        return this.operation;
    }

    /** Current retained content together with the protected original user boundary. */
    public get currentCommitScope(): CoderCommitScope {
        return { ...this.options.scope, repositorySnapshot: this.boundary, ownershipSnapshot: this.operation };
    }

    /** Known Coder wrapper/log paths never belong to a check command's transformation. */
    public get excludedArtifactPaths(): ReadonlyArray<string> {
        return [...this.excludedPaths];
    }

    /** Reserves ownership synchronously before the first await, including snapshots and Git persistence. */
    private async withOwnership<T>(activity: () => Promise<T>): Promise<T> {
        if (this.isMutationActive)
            throw new CoderGitOperationError(
                'record',
                'Concurrent Coder repository activities are not permitted in one execution checkout.',
            );
        this.isMutationActive = true;
        try {
            return await activity();
        } finally {
            this.isMutationActive = false;
        }
    }

    /** Writes one exact phase delta using the shared commit execution and configured identity/signing. */
    private async persist(
        before: CoderRepositorySnapshot,
        after: CoderRepositorySnapshot,
        retained: CoderRepositorySnapshot,
        phase: CoderPhaseCommitResult['phase'],
        message: string,
        checkOutcome?: CoderCheckOutcome['kind'],
        attempt?: number,
    ): Promise<CoderPhaseCommitResult> {
        const paths = listCoderTreeDelta(before.entries, after.entries);
        let commit: string | undefined;
        const persistenceRecordPath = paths.length
            ? await this.recovery.planPersistence({
                  phase,
                  beforeTree: before.tree,
                  afterTree: after.tree,
                  retainedTree: retained.tree,
                  message,
                  paths,
                  checkOutcome,
                  attempt,
                  isCommitEnabled: this.options.isCommitEnabled,
              })
            : undefined;
        if (paths.length && this.options.isCommitEnabled) {
            if (!this.isCommitConfirmationCompleted) {
                try {
                    await this.options.beforePersist?.();
                    this.options.signal?.throwIfAborted();
                } catch (error) {
                    throw new CoderGitOperationError(
                        'record',
                        `Phase persistence was interrupted before committing: ${
                            error instanceof Error ? error.message : String(error)
                        }`,
                    );
                }
                this.isCommitConfirmationCompleted = true;
            }
            const committed = await commitChanges(message, {
                projectPath: this.operation.repositoryRoot,
                snapshot: {
                    operation: this.operation,
                    before,
                    after,
                    retained,
                    excludedPaths: [...this.excludedPaths],
                    expectedHead: this.persistenceHead,
                    expectedIndex: this.persistenceIndex,
                    expectedIndexFlags: this.persistenceIndexFlags,
                },
                ...(this.options.signal ? { signal: this.options.signal } : {}),
            });
            if (committed) {
                commit = committed.commit;
                this.persistenceHead = commit;
                const expectedIndex = new Map(this.persistenceIndex);
                const expectedFlags = new Map(this.persistenceIndexFlags);
                for (const path of paths) {
                    const entry = after.entries.get(path);
                    if (entry) {
                        expectedIndex.set(path, entry);
                        expectedFlags.set(path, 'H');
                    } else {
                        expectedIndex.delete(path);
                        expectedFlags.delete(path);
                    }
                }
                this.persistenceIndex = expectedIndex;
                this.persistenceIndexFlags = expectedFlags;
            }
        }
        const current = await this.capture();
        if (
            current.head !== this.persistenceHead ||
            listCoderTreeDelta(this.persistenceIndex, current.indexEntries).length ||
            !areCoderFileHashesEqual(this.persistenceIndexFlags, current.indexFlags) ||
            !areCoderFileHashesEqual(current.workingFileHashes, retained.workingFileHashes)
        ) {
            throw new CoderGitOperationError(
                'record',
                'Unexpected concurrent changes while persisting the phase boundary. Existing history and the work were retained.',
            );
        }
        const result = { phase, paths, commit, checkOutcome, attempt };
        if (paths.length) this.commits.push(result);
        await this.recovery.finishPersistence(persistenceRecordPath, result);
        try {
            this.options.onPersisted?.(result);
        } catch (error) {
            throw new CoderGitOperationError(
                'record',
                `The phase was locally persisted, but reporting it failed: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
        }
        return result;
    }

    /** A successful private commit updates only owned real-index entries; refresh that intentional boundary. */
    private async refreshIndexBoundary(): Promise<void> {
        const current = await this.capture();
        if (
            current.head !== this.persistenceHead ||
            listCoderTreeDelta(this.persistenceIndex, current.indexEntries).length ||
            !areCoderFileHashesEqual(this.persistenceIndexFlags, current.indexFlags) ||
            !areCoderFileHashesEqual(current.workingFileHashes, this.boundary.workingFileHashes)
        ) {
            throw new CoderGitOperationError(
                'record',
                'Unexpected writes during phase persistence. The local commits and current work were retained.',
            );
        }
        this.boundary = current;
    }
}
