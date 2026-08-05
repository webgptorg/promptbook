import { readFile, stat, writeFile } from 'fs/promises';
import { resolve } from 'path';
import type { WorkingTreeChangesSnapshot } from '../git/workingTreeChanges';
import { captureWorkingTreeChangesSnapshot, listFilesChangedSinceSnapshot } from '../git/workingTreeChanges';

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
export type ChangedFilesSnapshot = WorkingTreeChangesSnapshot;

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
    return captureWorkingTreeChangesSnapshot(projectPath);
}

/**
 * Normalizes CRLF to LF only in files that changed since the captured snapshot.
 */
export async function normalizeLineEndingsInFilesChangedSinceSnapshot(
    options: NormalizeLineEndingsInChangedFilesOptions,
): Promise<NormalizeLineEndingsInChangedFilesResult> {
    const changedFiles = await listFilesChangedSinceSnapshot(options.projectPath, options.snapshot);
    let scannedFiles = 0;
    let normalizedFiles = 0;
    let skippedBinaryFiles = 0;

    for (const relativePath of changedFiles) {
        const absolutePath = resolveProjectPath(options.projectPath, relativePath);

        // Note: A file deleted or replaced by a directory during the round has no content to normalize
        if (!(await isRegularFile(absolutePath))) {
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
 * Resolves a repository-relative file path to an absolute path.
 */
function resolveProjectPath(projectPath: string, relativePath: string): string {
    return resolve(projectPath, relativePath);
}

/**
 * Checks whether a path exists and is a regular file.
 */
async function isRegularFile(path: string): Promise<boolean> {
    try {
        return (await stat(path)).isFile();
    } catch {
        return false;
    }
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
