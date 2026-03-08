import { createHash } from 'crypto';
import { readFile, stat, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { $execCommand } from '../../../src/utils/execCommand/$execCommand';

/**
 * Git commands used to list changed and untracked files in the working tree.
 */
const GIT_CHANGED_FILE_COMMANDS: ReadonlyArray<string> = [
    'git diff --name-only --',
    'git diff --name-only --cached --',
    'git ls-files --others --exclude-standard',
];

/**
 * File extensions that should always be treated as binary.
 */
const BINARY_FILE_EXTENSIONS = new Set<string>([
    '.7z',
    '.a',
    '.avi',
    '.bin',
    '.bmp',
    '.class',
    '.db',
    '.dll',
    '.dylib',
    '.eot',
    '.exe',
    '.gif',
    '.gz',
    '.ico',
    '.jar',
    '.jpeg',
    '.jpg',
    '.lockb',
    '.mov',
    '.mp3',
    '.mp4',
    '.o',
    '.otf',
    '.pdf',
    '.png',
    '.pyc',
    '.rar',
    '.so',
    '.sqlite',
    '.tar',
    '.ttf',
    '.wav',
    '.wasm',
    '.webm',
    '.webp',
    '.woff',
    '.woff2',
    '.zip',
]);

/**
 * Snapshot of file hashes for files that were already dirty before a coding round started.
 */
export type ChangedFilesSnapshot = {
    readonly changedFileHashes: ReadonlyMap<string, string>;
};

/**
 * Options for normalizing line endings in files changed during one coding round.
 */
export type NormalizeLineEndingsInChangedFilesOptions = {
    readonly projectPath: string;
    readonly snapshot: ChangedFilesSnapshot;
};

/**
 * Summary of one line-ending normalization pass.
 */
export type NormalizeLineEndingsInChangedFilesResult = {
    readonly scannedFiles: number;
    readonly normalizedFiles: number;
    readonly skippedBinaryFiles: number;
};

/**
 * Captures hashes for files that are dirty before a coding round starts.
 */
export async function captureChangedFilesSnapshot(projectPath: string): Promise<ChangedFilesSnapshot> {
    const changedFiles = await listWorkingTreeChangedFiles(projectPath);
    const changedFileHashes = new Map<string, string>();

    for (const relativePath of changedFiles) {
        const absolutePath = resolveProjectPath(projectPath, relativePath);
        const fileHash = await readFileHashIfRegularFile(absolutePath);

        if (fileHash) {
            changedFileHashes.set(relativePath, fileHash);
        }
    }

    return { changedFileHashes };
}

/**
 * Normalizes CRLF to LF only in files that changed since the captured snapshot.
 */
export async function normalizeLineEndingsInFilesChangedSinceSnapshot(
    options: NormalizeLineEndingsInChangedFilesOptions,
): Promise<NormalizeLineEndingsInChangedFilesResult> {
    const changedFiles = await listWorkingTreeChangedFiles(options.projectPath);
    let scannedFiles = 0;
    let normalizedFiles = 0;
    let skippedBinaryFiles = 0;

    for (const relativePath of changedFiles) {
        const absolutePath = resolveProjectPath(options.projectPath, relativePath);
        const currentFileHash = await readFileHashIfRegularFile(absolutePath);

        if (!currentFileHash) {
            continue;
        }

        const hashBeforeRound = options.snapshot.changedFileHashes.get(relativePath);
        const hasChangedInRound = hashBeforeRound === undefined || hashBeforeRound !== currentFileHash;

        if (!hasChangedInRound) {
            continue;
        }

        scannedFiles++;

        if (isBinaryByExtension(relativePath)) {
            skippedBinaryFiles++;
            continue;
        }

        const fileContent = await readFile(absolutePath);
        if (containsNulByte(fileContent)) {
            skippedBinaryFiles++;
            continue;
        }

        const normalizedContent = normalizeCrLfToLf(fileContent);
        if (!normalizedContent) {
            continue;
        }

        await writeFile(absolutePath, normalizedContent);
        normalizedFiles++;
    }

    return {
        scannedFiles,
        normalizedFiles,
        skippedBinaryFiles,
    };
}

/**
 * Lists dirty tracked files and untracked files in the working tree.
 */
async function listWorkingTreeChangedFiles(projectPath: string): Promise<ReadonlyArray<string>> {
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
 * Normalizes Git output paths for internal matching.
 */
function normalizeGitFilePath(filePath: string): string {
    return filePath.trim().replace(/\\/g, '/');
}

/**
 * Resolves a repository-relative file path to an absolute path.
 */
function resolveProjectPath(projectPath: string, relativePath: string): string {
    return resolve(projectPath, relativePath);
}

/**
 * Reads file hash for a regular file and returns undefined for non-files/missing files.
 */
async function readFileHashIfRegularFile(path: string): Promise<string | undefined> {
    try {
        const fileStats = await stat(path);
        if (!fileStats.isFile()) {
            return undefined;
        }

        const content = await readFile(path);
        return createHash('sha1').update(content).digest('hex');
    } catch (error) {
        if (isFileNotFoundError(error)) {
            return undefined;
        }

        throw error;
    }
}

/**
 * Returns true when an error is a missing-file filesystem error.
 */
function isFileNotFoundError(error: unknown): boolean {
    return Boolean(
        error &&
            typeof error === 'object' &&
            'code' in error &&
            (((error as { code?: string }).code === 'ENOENT') || (error as { code?: string }).code === 'ENOTDIR'),
    );
}

/**
 * Detects binary files from extension.
 */
function isBinaryByExtension(path: string): boolean {
    const lowerCasedPath = path.toLowerCase();

    for (const binaryExtension of BINARY_FILE_EXTENSIONS) {
        if (lowerCasedPath.endsWith(binaryExtension)) {
            return true;
        }
    }

    return false;
}

/**
 * Detects NUL bytes in a file buffer.
 */
function containsNulByte(content: Buffer): boolean {
    return content.includes(0);
}

/**
 * Converts CRLF byte pairs into LF.
 *
 * @returns New normalized buffer when conversion happened, otherwise undefined.
 */
function normalizeCrLfToLf(content: Buffer): Buffer | undefined {
    const normalized = Buffer.allocUnsafe(content.length);
    let writeIndex = 0;
    let hasNormalizedLineEnding = false;

    for (let readIndex = 0; readIndex < content.length; readIndex++) {
        const currentByte = content[readIndex]!;
        const nextByte = content[readIndex + 1];

        if (currentByte === 13 && nextByte === 10) {
            normalized[writeIndex] = 10;
            writeIndex++;
            readIndex++;
            hasNormalizedLineEnding = true;
            continue;
        }

        normalized[writeIndex] = currentByte;
        writeIndex++;
    }

    if (!hasNormalizedLineEnding) {
        return undefined;
    }

    return normalized.subarray(0, writeIndex);
}
