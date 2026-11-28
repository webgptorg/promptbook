// cspell:ignore pathspecs NOGLOB ICASE
import { createHash } from 'crypto';
import { lstat, mkdir, mkdtemp, readFile, readlink, rm } from 'fs/promises';
import { join, resolve } from 'path';
import { spaceTrim } from 'spacetrim';
import { $runWorkspaceGit } from '../../../src/cli/cli-commands/common/workspaceRepository';
import { CoderGitOperationError } from './CoderGitOperationError';
import { listWorkingTreeChangedFiles } from './workingTreeChanges';
import { runWorkspaceGitWithIndexReadRetry } from './runWorkspaceGitWithIndexReadRetry';

/** Any execute permission marks a regular Git blob as executable, independent of core.filemode. */
const FILE_EXECUTABLE_PERMISSION_MASK = 0o111;
/** Full filesystem permissions copied from a private check result without widening access to its files. */
export const CODER_FILE_PERMISSIONS_MASK = 0o777;
/** Object widths used for index removal records in either supported repository format. */
const SHA256_OBJECT_ID_LENGTH = 64;
/** Traditional Git object width, retained for empty-tree index removal records. */
const SHA1_OBJECT_ID_LENGTH = 40;
/** Retained execution checkouts are separate repositories, including those below a selected nested project. */
export const CODER_ISOLATION_WORKTREE_PATH_PATTERN = /(?:^|\/)\.promptbook\/coder-isolation-worktrees(?:\/|$)/u;

/** Content and mode of one leaf of a Git tree (including symlinks and binary blobs). */
export type CoderTreeEntry = { readonly mode: string; readonly objectId: string };

/** Non-destructive content/index boundary of a serialized Coder phase. */
export type CoderRepositorySnapshot = {
    readonly repositoryRoot: string;
    readonly head?: string;
    readonly tree: string;
    readonly entries: ReadonlyMap<string, CoderTreeEntry>;
    readonly indexEntries: ReadonlyMap<string, CoderTreeEntry>;
    /** Includes skip-worktree/assume-unchanged flags, which can hide pre-existing content from status. */
    readonly indexFlags: ReadonlyMap<string, string>;
    readonly indexFingerprint: string;
    /** Raw bytes and filesystem modes, also detecting changes hidden by Git attributes/filters. */
    readonly workingFileHashes: ReadonlyMap<string, string>;
    /** Git's actual initial dirtiness, independent of clean-checkout smudge/line-ending transformations. */
    readonly dirtyPaths: ReadonlyArray<string>;
};

/** Literal filenames must not inherit globbing settings from the user's environment. */
export const CODER_LITERAL_GIT_ENV = {
    GIT_LITERAL_PATHSPECS: '1',
    GIT_GLOB_PATHSPECS: '0',
    GIT_NOGLOB_PATHSPECS: '0',
    GIT_ICASE_PATHSPECS: '0',
};

/** Reads a tree using raw NUL-delimited filenames instead of Git's display quoting. */
export async function readCoderTree(
    repositoryRoot: string,
    tree: string,
    env?: Record<string, string>,
): Promise<Map<string, CoderTreeEntry>> {
    const output = await $runWorkspaceGit(repositoryRoot, ['ls-tree', '-r', '-z', tree], { env });
    return parseCoderTreeEntries(output);
}

/** Parses either ls-tree or stage-zero ls-files output; unresolved merges cannot be persisted safely. */
export function parseCoderTreeEntries(output: string): Map<string, CoderTreeEntry> {
    const entries = new Map<string, CoderTreeEntry>();
    for (const record of output.split('\0').filter(Boolean)) {
        const separatorIndex = record.indexOf('\t');
        const fields = record.slice(0, separatorIndex).split(' ');
        const isIndexRecord = /^[0-3]$/u.test(fields[2]!);
        if (isIndexRecord && fields[2] !== '0') {
            throw new CoderGitOperationError(
                'record',
                'The Git index contains an unresolved merge. Retain and resolve it before running Coder.',
            );
        }
        entries.set(record.slice(separatorIndex + 1), {
            mode: fields[0]!,
            objectId: isIndexRecord ? fields[1]! : fields[2]!,
        });
    }
    return entries;
}

/** Reads an optional HEAD without treating arbitrary Git errors as an unborn branch. */
export async function readCoderHead(repositoryRoot: string, env?: Record<string, string>): Promise<string | undefined> {
    try {
        return (await $runWorkspaceGit(repositoryRoot, ['rev-parse', '--verify', '--quiet', 'HEAD'], { env })).trim();
    } catch (error) {
        if ((error as { code?: number }).code === 1) return undefined;
        throw error;
    }
}

/** Builds a private index outside the working tree; the user's staging area is never used for snapshots. */
export async function withCoderSnapshotIndex<T>(
    repositoryRoot: string,
    operation: (indexPath: string) => Promise<T>,
    gitEnvironment?: Record<string, string>,
): Promise<T> {
    const gitDirectory = (
        await $runWorkspaceGit(repositoryRoot, ['rev-parse', '--absolute-git-dir'], { env: gitEnvironment })
    ).trim();
    const snapshotsDirectory = join(gitDirectory, 'ptbk-coder', 'snapshots');
    await mkdir(snapshotsDirectory, { recursive: true });
    const directory = await mkdtemp(join(snapshotsDirectory, 'index-'));
    try {
        return await operation(join(directory, 'index'));
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
}

/** Captures retained bytes, a staged tree and the real index after the phase's owned writers have stopped. */
export async function captureCoderRepositorySnapshot(
    repositoryRoot: string,
    excludePaths: ReadonlyArray<string> = [],
    gitEnvironment?: Record<string, string>,
): Promise<CoderRepositorySnapshot> {
    try {
        /** Uses the same shared Git service for a checkout or a private check content view. */
        const git = (
            argumentsList: ReadonlyArray<string>,
            options?: { env?: Record<string, string>; input?: string | Buffer },
        ): Promise<string> =>
            runWorkspaceGitWithIndexReadRetry(repositoryRoot, argumentsList, {
                ...options,
                env: { ...gitEnvironment, ...options?.env },
            });
        // These inspections are read-only. Run them together to avoid paying for serial Git startup on every
        // boundary; the complete second inspection below still rejects concurrent content/index changes.
        const [head, indexOutput, indexFlagOutput, untrackedOutput, changedPaths, objectFormatOutput] =
            await Promise.all([
                readCoderHead(repositoryRoot, gitEnvironment),
                git(['ls-files', '--stage', '-z']),
                git(['ls-files', '-v', '-z']),
                git(['ls-files', '--others', '--exclude-standard', '-z']),
                listWorkingTreeChangedFiles(repositoryRoot, gitEnvironment),
                git(['rev-parse', '--show-object-format']),
            ]);
        const indexFingerprint = `${indexOutput}\n${indexFlagOutput}`;
        const indexEntries = parseCoderTreeEntries(indexOutput);
        const indexFlags = new Map(
            indexFlagOutput
                .split('\0')
                .filter(Boolean)
                .map((record) => [record.slice(2), record[0]!]),
        );
        const trackedEntries = head
            ? await readCoderTree(repositoryRoot, head, gitEnvironment)
            : new Map<string, CoderTreeEntry>();
        const excludedPaths = new Set(excludePaths);
        const dirtyPaths = changedPaths.filter((path) => !excludedPaths.has(path));
        const objectFormat = objectFormatOutput.trim();
        const paths = [
            ...new Set([
                ...trackedEntries.keys(),
                ...indexEntries.keys(),
                ...untrackedOutput.split('\0').filter(Boolean),
            ]),
        ]
            .filter((path) => !excludedPaths.has(path))
            .sort();
        const workingFileHashes = await readCoderWorkingFileHashes(repositoryRoot, paths, objectFormat);
        const tree = await withCoderSnapshotIndex(
            repositoryRoot,
            async (indexPath) => {
                const env = { ...gitEnvironment, ...CODER_LITERAL_GIT_ENV, GIT_INDEX_FILE: indexPath };
                await git(['read-tree', head ?? '--empty'], { env });
                // Write raw objects directly. Snapshotting must not invoke user clean filters, which can transform
                // bytes or even run writers of their own. Neither snapshotting nor committing stages the user's index.
                const objectIds = [...new Set([...workingFileHashes.values()].map((hash) => hash.split(':')[1]!))];
                const objectInspection = objectIds.length
                    ? await git(['cat-file', '--batch-check'], {
                          input: `${objectIds.join('\n')}\n`,
                      })
                    : '';
                const missingObjectIds = new Set(
                    objectInspection
                        .split('\n')
                        .filter((line) => line.endsWith(' missing'))
                        .map((line) => line.split(' ')[0]!),
                );
                const stagedEntries = new Map<string, CoderTreeEntry>();
                for (const [path, hash] of workingFileHashes) {
                    const [mode, objectId] = hash.split(':');
                    if (missingObjectIds.has(objectId!)) {
                        const absolutePath = resolve(repositoryRoot, path);
                        const bytes =
                            mode === '120000'
                                ? Buffer.from(await readlink(absolutePath))
                                : await readFile(absolutePath);
                        const writtenObjectId = (
                            await git(['hash-object', '-w', '--no-filters', '--stdin'], { input: bytes })
                        ).trim();
                        if (writtenObjectId !== objectId)
                            throw new CoderGitOperationError(
                                'record',
                                `File \`${path}\` changed during raw snapshot capture.`,
                            );
                        missingObjectIds.delete(objectId!);
                    }
                    stagedEntries.set(path, { mode: mode!, objectId: objectId! });
                }
                for (const [path, entry] of trackedEntries) {
                    if (entry.mode !== '160000' || excludedPaths.has(path)) continue;
                    try {
                        if ((await lstat(resolve(repositoryRoot, path))).isDirectory()) stagedEntries.set(path, entry);
                    } catch (error) {
                        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
                    }
                }
                await updateCoderIndex(repositoryRoot, stagedEntries, [...new Set([...paths, ...excludedPaths])], env);
                return (await git(['write-tree'], { env })).trim();
            },
            gitEnvironment,
        );
        const [afterHashes, afterHead, afterIndexOutput, afterIndexFlagOutput, afterUntrackedOutput, entries] =
            await Promise.all([
                readCoderWorkingFileHashes(repositoryRoot, paths, objectFormat),
                readCoderHead(repositoryRoot, gitEnvironment),
                git(['ls-files', '--stage', '-z']),
                git(['ls-files', '-v', '-z']),
                git(['ls-files', '--others', '--exclude-standard', '-z']),
                readCoderTree(repositoryRoot, tree, gitEnvironment),
            ]);
        if (
            head !== afterHead ||
            indexOutput !== afterIndexOutput ||
            indexFlagOutput !== afterIndexFlagOutput ||
            !areCoderFileHashesEqual(workingFileHashes, afterHashes) ||
            untrackedOutput !== afterUntrackedOutput
        ) {
            throw new CoderGitOperationError(
                'record',
                'The repository changed while a content boundary was being captured. Stop concurrent editors/writers and inspect the retained work.',
            );
        }
        return {
            repositoryRoot,
            head,
            tree,
            entries,
            indexEntries,
            indexFlags,
            indexFingerprint,
            workingFileHashes,
            dirtyPaths,
        };
    } catch (error) {
        if (error instanceof CoderGitOperationError) throw error;
        throw new CoderGitOperationError('record', error instanceof Error ? error.message : String(error));
    }
}

/** Hashes bytes, symlink targets and executable modes without following symlinks out of the checkout. */
export async function readCoderWorkingFileHashes(
    repositoryRoot: string,
    paths: ReadonlyArray<string>,
    objectFormat: string,
): Promise<Map<string, string>> {
    const hashes = new Map<string, string>();
    for (const path of paths) {
        try {
            const absolutePath = resolve(repositoryRoot, path);
            const details = await lstat(absolutePath);
            if (details.isDirectory()) continue;
            const bytes = details.isSymbolicLink()
                ? Buffer.from(await readlink(absolutePath))
                : await readFile(absolutePath);
            const mode = details.isSymbolicLink()
                ? '120000'
                : details.mode & FILE_EXECUTABLE_PERMISSION_MASK
                ? '100755'
                : '100644';
            hashes.set(
                path,
                `${mode}:${createHash(objectFormat).update(`blob ${bytes.length}\0`).update(bytes).digest('hex')}`,
            );
        } catch (error) {
            if (!['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
        }
    }
    return hashes;
}

/**
 * Captures ignored files for check-view retention, using the same raw byte/mode hashing as eligible content.
 * These hashes never make ignored files eligible for an automatic Git commit.
 */
export async function captureCoderIgnoredFileHashes(
    repositoryRoot: string,
    excludePaths: ReadonlyArray<string>,
): Promise<Map<string, string>> {
    const excludedPaths = new Set(excludePaths);
    const paths = (
        await $runWorkspaceGit(repositoryRoot, ['ls-files', '--others', '--ignored', '--exclude-standard', '-z'])
    )
        .split('\0')
        .filter(
            (path) =>
                path &&
                !CODER_ISOLATION_WORKTREE_PATH_PATTERN.test(path) &&
                ![...excludedPaths].some((excluded) => path === excluded || path.startsWith(`${excluded}/`)),
        );
    const objectFormat = (await $runWorkspaceGit(repositoryRoot, ['rev-parse', '--show-object-format'])).trim();
    return readCoderWorkingFileHashes(repositoryRoot, paths, objectFormat);
}

/** Keeps explicitly ignored new Coder artifacts out of the private commit index, just as ordinary staging does. */
export async function isCoderGitPathIgnored(repositoryRoot: string, path: string): Promise<boolean> {
    try {
        await $runWorkspaceGit(repositoryRoot, ['check-ignore', '--quiet', '--', path]);
        return true;
    } catch (error) {
        if ((error as { code?: number }).code === 1) return false;
        throw new CoderGitOperationError(
            'record',
            `Could not inspect ignore policy for \`${path}\`: ${
                error instanceof Error ? error.message : String(error)
            }`,
        );
    }
}

/** Compares raw retained content, including deletions. */
export function areCoderFileHashesEqual(
    left: ReadonlyMap<string, string>,
    right: ReadonlyMap<string, string>,
): boolean {
    return left.size === right.size && [...left].every(([path, hash]) => right.get(path) === hash);
}

/** Lists the actual content/mode delta, even when a check reverts an earlier edit back to HEAD. */
export function listCoderTreeDelta(
    before: ReadonlyMap<string, CoderTreeEntry>,
    after: ReadonlyMap<string, CoderTreeEntry>,
): string[] {
    return [...new Set([...before.keys(), ...after.keys()])]
        .filter(
            (path) =>
                before.get(path)?.objectId !== after.get(path)?.objectId ||
                before.get(path)?.mode !== after.get(path)?.mode,
        )
        .sort();
}

/** Writes exact blob/mode entries, including removals, into an explicit index. */
export async function updateCoderIndex(
    repositoryRoot: string,
    entries: ReadonlyMap<string, CoderTreeEntry>,
    paths: ReadonlyArray<string>,
    env?: Record<string, string>,
): Promise<void> {
    if (!paths.length) return;
    const objectIdLength =
        [...entries.values()][0]?.objectId.length ??
        ((await $runWorkspaceGit(repositoryRoot, ['rev-parse', '--show-object-format'])).trim() === 'sha256'
            ? SHA256_OBJECT_ID_LENGTH
            : SHA1_OBJECT_ID_LENGTH);
    const input = paths
        .map((path) => {
            const entry = entries.get(path);
            // Mode zero accepts the null object; use the repository's object length for SHA-256 repositories too.
            return `${entry?.mode ?? '0'} ${entry?.objectId ?? '0'.repeat(objectIdLength)}\t${path}\0`;
        })
        .join('');
    await $runWorkspaceGit(repositoryRoot, ['update-index', '-z', '--index-info'], { env, input });
}

/** Includes original user working bytes, staging entries, hidden index flags and executable-bit changes. */
export function getCoderProtectedPaths(
    operation: CoderRepositorySnapshot,
    headEntries: ReadonlyMap<string, CoderTreeEntry>,
): ReadonlySet<string> {
    return new Set([
        ...operation.dirtyPaths,
        ...listCoderTreeDelta(headEntries, operation.indexEntries),
        ...[...operation.indexFlags]
            .filter(([, flag]) => flag === 'S' || flag === flag.toLowerCase())
            .map(([path]) => path),
        ...[...operation.entries]
            .filter(([path, entry]) => headEntries.has(path) && headEntries.get(path)!.mode !== entry.mode)
            .map(([path]) => path),
    ]);
}

/** Refuses overlapping user work, including staged content which differs from the working file. */
export function assertCoderDeltaIsOwned(
    operation: CoderRepositorySnapshot,
    paths: ReadonlyArray<string>,
    headEntries: ReadonlyMap<string, CoderTreeEntry>,
): void {
    const protectedPaths = getCoderProtectedPaths(operation, headEntries);
    const overlappingPaths = paths.filter((path) => protectedPaths.has(path));
    if (!overlappingPaths.length) return;
    throw new CoderGitOperationError(
        'record',
        spaceTrim(`
        Cannot safely attribute changes overlapping pre-existing user work:
        ${overlappingPaths.map((path) => `- \`${path}\``).join('\n')}

        Both staged and unstaged content have been retained. Separate these edits manually before resuming persistence.
    `),
    );
}

/** Materializes immutable staged entries in a private index so recovery references also retain staged blobs. */
export async function captureCoderIndexTree(snapshot: CoderRepositorySnapshot): Promise<string> {
    return withCoderSnapshotIndex(snapshot.repositoryRoot, async (indexPath) => {
        const env = { ...CODER_LITERAL_GIT_ENV, GIT_INDEX_FILE: indexPath };
        await $runWorkspaceGit(snapshot.repositoryRoot, ['read-tree', '--empty'], { env });
        await updateCoderIndex(snapshot.repositoryRoot, snapshot.indexEntries, [...snapshot.indexEntries.keys()], env);
        return (await $runWorkspaceGit(snapshot.repositoryRoot, ['write-tree'], { env })).trim();
    });
}
