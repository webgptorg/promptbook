import { createHash } from 'crypto';
import { readFile, stat } from 'fs/promises';
import { resolve } from 'path';
import { $execCommand } from '../../../src/utils/execCommand/$execCommand';

/**
 * Git commands used to list changed and untracked files in the working tree.
 *
 * Note: None of them ever lists a file ignored by `.gitignore`, so a path taken from here can always be staged.
 * Note: `--no-renames` is used because a detected rename would be reported as its destination path only, which
 *       would leave the source path of a moved file out of the commit.
 */
const GIT_CHANGED_FILE_COMMANDS: ReadonlyArray<string> = [
    'git diff --name-only --no-renames --',
    'git diff --name-only --no-renames --cached --',
    'git ls-files --others --exclude-standard',
];

/**
 * Snapshot of file hashes for files that were already dirty before one operation started.
 *
 * Note: This is the single source of truth about which files one `ptbk coder` operation has really changed,
 *       used both for normalizing line endings and for committing only the relevant files.
 */
export type WorkingTreeChangesSnapshot = {
    /**
     * Hash of every dirty file at the moment the snapshot was taken.
     *
     * A file which was dirty but could not be hashed (a deleted file or a non-regular file) is stored as `null`,
     * so it can be told apart from a file which was not dirty at all.
     */
    readonly changedFileHashes: ReadonlyMap<string, string | null>;
};

/**
 * Captures hashes for files that are dirty before one operation starts.
 */
export async function captureWorkingTreeChangesSnapshot(projectPath: string): Promise<WorkingTreeChangesSnapshot> {
    const changedFiles = await listWorkingTreeChangedFiles(projectPath);
    const changedFileHashes = new Map<string, string | null>();

    for (const relativePath of changedFiles) {
        changedFileHashes.set(relativePath, await readWorkingTreeFileHash(projectPath, relativePath));
    }

    return { changedFileHashes };
}

/**
 * Lists the repository-relative paths which really changed since the snapshot was taken.
 *
 * A file which was already dirty before and was not touched afterwards is not listed, so the result contains
 * exactly the files changed by the operation which the snapshot wraps.
 */
export async function listFilesChangedSinceSnapshot(
    projectPath: string,
    snapshot: WorkingTreeChangesSnapshot,
): Promise<ReadonlyArray<string>> {
    const changedFiles = await listWorkingTreeChangedFiles(projectPath);
    const changedFilesSinceSnapshot: string[] = [];

    for (const relativePath of changedFiles) {
        const currentFileHash = await readWorkingTreeFileHash(projectPath, relativePath);
        const hashBeforeOperation = snapshot.changedFileHashes.get(relativePath);
        const wasDirtyBeforeOperation = snapshot.changedFileHashes.has(relativePath);

        if (wasDirtyBeforeOperation && hashBeforeOperation === currentFileHash) {
            continue;
        }

        changedFilesSinceSnapshot.push(relativePath);
    }

    return changedFilesSinceSnapshot;
}

/**
 * Lists dirty tracked files and untracked files in the working tree.
 */
export async function listWorkingTreeChangedFiles(projectPath: string): Promise<ReadonlyArray<string>> {
    const changedFiles = new Set<string>();

    for (const command of GIT_CHANGED_FILE_COMMANDS) {
        const output = await $execCommand({
            command,
            cwd: projectPath,
            isVerbose: false,
        });

        for (const filePath of output.split('\n').map(normalizeGitFilePath).filter(Boolean)) {
            changedFiles.add(filePath);
        }
    }

    return [...changedFiles.values()];
}

/**
 * Reads the content hash of one repository-relative working tree file.
 *
 * @returns Hash of a regular file, otherwise `null` for a deleted or non-regular file.
 */
export async function readWorkingTreeFileHash(projectPath: string, relativePath: string): Promise<string | null> {
    try {
        const absolutePath = resolve(projectPath, relativePath);
        const fileStats = await stat(absolutePath);
        if (!fileStats.isFile()) {
            return null;
        }

        const content = await readFile(absolutePath);
        return createHash('sha1').update(content).digest('hex');
    } catch (error) {
        if (isFileNotFoundError(error)) {
            return null;
        }

        throw error;
    }
}

/**
 * Normalizes Git output paths for internal matching.
 */
export function normalizeGitFilePath(filePath: string): string {
    return filePath.trim().replace(/\\/g, '/');
}

/**
 * Returns true when an error is a missing-file filesystem error.
 */
function isFileNotFoundError(error: unknown): boolean {
    return Boolean(
        error &&
            typeof error === 'object' &&
            'code' in error &&
            ((error as { code?: string }).code === 'ENOENT' || (error as { code?: string }).code === 'ENOTDIR'),
    );
}
