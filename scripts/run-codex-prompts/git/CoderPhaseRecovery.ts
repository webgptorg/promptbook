import { randomBytes } from 'crypto';
import { lstat, mkdir, readFile, readlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { $runWorkspaceGit } from '../../../src/cli/cli-commands/common/workspaceRepository';
import type { CoderCommitScope } from './coderCommitScope';
import { captureCoderIndexTree, type CoderRepositorySnapshot } from './coderRepositorySnapshot';
import { CoderGitOperationError } from './CoderGitOperationError';
import { formatUnknownErrorDetails } from '../common/formatUnknownErrorDetails';
import type { CoderPhaseCommitResult } from './CoderPhasePersistence';

/** Exact persistence plan retained before Git can fail partway through the phase chronology. */
export type CoderPhasePersistenceRecord = {
    readonly phase: CoderPhaseCommitResult['phase'];
    readonly beforeTree: string;
    readonly afterTree: string;
    readonly retainedTree: string;
    readonly message: string;
    readonly paths: ReadonlyArray<string>;
    readonly checkOutcome?: CoderPhaseCommitResult['checkOutcome'];
    readonly attempt?: number;
    readonly isCommitEnabled: boolean;
};

/** Durable original bytes/index and successive phase trees, outside the user's working tree. */
export class CoderPhaseRecovery {
    private readonly id = randomBytes(16).toString('hex');
    private directory?: string;
    private sequence = 0;

    /** Records content from exactly the same explicit operation scope as commit persistence. */
    public constructor(private readonly scope: CoderCommitScope) {}

    /** Saves originals before any owned writer can touch them, preserving raw bytes as well as staged blobs. */
    public async initialize(snapshot: CoderRepositorySnapshot): Promise<void> {
        try {
            await this.initializeFiles(snapshot);
        } catch (error) {
            throw new CoderGitOperationError(
                'record',
                `Could not persist original phase ownership in \`${this.directory}\`: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
        }
    }

    /** Writes original raw files and immutable staging references before the first owned process starts. */
    private async initializeFiles(snapshot: CoderRepositorySnapshot): Promise<void> {
        if (this.directory) return;
        const gitDirectory = (
            await $runWorkspaceGit(snapshot.repositoryRoot, ['rev-parse', '--absolute-git-dir'])
        ).trim();
        this.directory = join(gitDirectory, 'ptbk-coder', 'recovery', this.id);
        await mkdir(this.directory, { recursive: true });
        const originals: { path: string; backup: string; mode: number; isSymbolicLink: boolean }[] = [];
        for (const path of this.scope.snapshotBeforeOperation.changedFileHashes.keys()) {
            try {
                const details = await lstat(join(snapshot.repositoryRoot, path));
                if (details.isDirectory()) continue;
                const backup = `original-${originals.length}`;
                const isSymbolicLink = details.isSymbolicLink();
                await writeFile(
                    join(this.directory, backup),
                    isSymbolicLink
                        ? await readlink(join(snapshot.repositoryRoot, path))
                        : await readFile(join(snapshot.repositoryRoot, path)),
                );
                originals.push({ path, backup, mode: details.mode, isSymbolicLink });
            } catch (error) {
                if (!['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
            }
        }
        const indexTree = await captureCoderIndexTree(snapshot);
        await $runWorkspaceGit(snapshot.repositoryRoot, [
            'update-ref',
            `refs/ptbk-coder/recovery/${this.id}/original-index`,
            indexTree,
        ]);
        await writeFile(
            join(this.directory, 'ownership.json'),
            JSON.stringify(
                {
                    projectPath: this.scope.projectPath,
                    repositoryRoot: snapshot.repositoryRoot,
                    head: snapshot.head,
                    tree: snapshot.tree,
                    indexTree,
                    originals,
                },
                null,
                2,
            ),
        );
        await this.record(snapshot, 'operation');
        if (this.scope.ownershipSnapshot && this.scope.repositorySnapshot)
            await this.record(this.scope.repositorySnapshot, 'phase-start');
    }

    /** Retains immutable trees through GC and names each boundary for interruption/manual persistence recovery. */
    public async record(
        snapshot: CoderRepositorySnapshot,
        phase: string,
        details?: {
            readonly viewPath: string;
            readonly checkOutcome: string;
            readonly output: string;
            readonly ignoredFileHashes?: ReadonlyArray<readonly [string, string]>;
        },
    ): Promise<void> {
        if (!this.directory) return;
        try {
            const name = `${++this.sequence}-${phase}`;
            const indexTree = await captureCoderIndexTree(snapshot);
            await $runWorkspaceGit(snapshot.repositoryRoot, [
                'update-ref',
                `refs/ptbk-coder/recovery/${this.id}/${name}-index`,
                indexTree,
            ]);
            await $runWorkspaceGit(snapshot.repositoryRoot, [
                'update-ref',
                `refs/ptbk-coder/recovery/${this.id}/${name}`,
                snapshot.tree,
            ]);
            await writeFile(
                join(this.directory, `${name}.json`),
                JSON.stringify(
                    {
                        head: snapshot.head,
                        tree: snapshot.tree,
                        indexTree,
                        indexEntries: [...snapshot.indexEntries],
                        indexFlags: [...snapshot.indexFlags],
                        dirtyPaths: snapshot.dirtyPaths,
                        workingFileHashes: [...snapshot.workingFileHashes],
                        ...details,
                    },
                    null,
                    2,
                ),
            );
        } catch (error) {
            throw new CoderGitOperationError(
                'record',
                `Could not persist the \`${phase}\` content boundary in \`${this.directory}\`: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
        }
    }

    /** Records which version belongs to which authoring phase before any local commit is attempted. */
    public async planPersistence(record: CoderPhasePersistenceRecord): Promise<string | undefined> {
        if (!this.directory) return undefined;
        const path = join(this.directory, `${++this.sequence}-${record.phase}-persistence.json`);
        try {
            await writeFile(
                path,
                JSON.stringify(
                    { ...record, state: record.isCommitEnabled ? 'pending-commit' : 'retained-without-commit' },
                    null,
                    2,
                ),
            );
            return path;
        } catch (error) {
            throw new CoderGitOperationError(
                'record',
                `Could not retain the phase persistence plan in \`${path}\`: ${formatUnknownErrorDetails(error)}`,
            );
        }
    }

    /** Updates the same plan after successful local persistence, without claiming remote synchronization. */
    public async finishPersistence(path: string | undefined, result: CoderPhaseCommitResult): Promise<void> {
        if (!path) return;
        try {
            const record = JSON.parse(await readFile(path, 'utf-8')) as CoderPhasePersistenceRecord;
            await writeFile(
                path,
                JSON.stringify(
                    {
                        ...record,
                        commit: result.commit,
                        state: result.commit
                            ? 'locally-persisted'
                            : record.isCommitEnabled
                            ? 'already-committed-representation'
                            : 'retained-without-commit',
                    },
                    null,
                    2,
                ),
            );
        } catch (error) {
            throw new CoderGitOperationError(
                'record',
                `Local persistence reporting failed in \`${path}\`: ${formatUnknownErrorDetails(error)}`,
            );
        }
    }

    /** Preserves a failure diagnostic in a unique supported recovery location without replacing user files. */
    public async recordFailure(
        error: unknown,
        commits: ReadonlyArray<CoderPhaseCommitResult>,
    ): Promise<string | undefined> {
        if (!this.directory) return undefined;
        const path = join(this.directory, `${++this.sequence}-failure.json`);
        try {
            await writeFile(path, JSON.stringify({ error: formatUnknownErrorDetails(error), commits }, null, 2));
            return path;
        } catch (recordError) {
            // The original failure category must survive a failure of its supplementary diagnostic.
            console.warn(`Could not retain failure details in \`${path}\`: ${formatUnknownErrorDetails(recordError)}`);
            return undefined;
        }
    }

    /** Location included in diagnostics, without dumping private user file contents into terminal output. */
    public get path(): string | undefined {
        return this.directory;
    }
}
