import { mkdir, readFile, rename, stat, writeFile } from 'fs/promises';
import { dirname, join } from 'path';

/**
 * Content loaded from one local runner project file.
 */
export type LocalAgentRunnerFile = {
    content: string;
};

/**
 * Writes one local runner project file through a sibling temporary file.
 */
export async function upsertLocalAgentRunnerFile(options: {
    readonly projectPath: string;
    readonly path: string;
    readonly content: string;
}): Promise<void> {
    const filePath = resolveLocalAgentRunnerFilePath(options.projectPath, options.path);
    const temporaryFilePath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(temporaryFilePath, options.content, 'utf-8');
    await rename(temporaryFilePath, filePath);
}

/**
 * Creates one empty local runner project file only when it does not exist yet.
 */
export async function createLocalAgentRunnerFileIfMissing(options: {
    readonly projectPath: string;
    readonly path: string;
    readonly content: string;
}): Promise<void> {
    const filePath = resolveLocalAgentRunnerFilePath(options.projectPath, options.path);

    if (await isExistingFile(filePath)) {
        return;
    }

    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, options.content, { encoding: 'utf-8', flag: 'wx' }).catch((error) => {
        if (!isAlreadyExistingFileError(error)) {
            throw error;
        }
    });
}

/**
 * Reads one local runner project file and returns `null` when it does not exist yet.
 */
export async function readLocalAgentRunnerFile(
    projectPath: string,
    relativePath: string,
): Promise<LocalAgentRunnerFile | null> {
    try {
        return {
            content: await readFile(resolveLocalAgentRunnerFilePath(projectPath, relativePath), 'utf-8'),
        };
    } catch (error) {
        if (isMissingFileError(error)) {
            return null;
        }

        throw error;
    }
}

/**
 * Resolves one known runner-relative path within a local agent project root.
 */
function resolveLocalAgentRunnerFilePath(projectPath: string, relativePath: string): string {
    return join(projectPath, relativePath);
}

/**
 * Checks whether one filesystem path points to an existing regular file.
 */
async function isExistingFile(filePath: string): Promise<boolean> {
    try {
        return (await stat(filePath)).isFile();
    } catch (error) {
        if (isMissingFileError(error)) {
            return false;
        }

        throw error;
    }
}

/**
 * Returns `true` for filesystem errors caused by missing paths.
 */
function isMissingFileError(error: unknown): boolean {
    return Boolean(
        error &&
            typeof error === 'object' &&
            'code' in error &&
            ((error as { code?: string }).code === 'ENOENT' || (error as { code?: string }).code === 'ENOTDIR'),
    );
}

/**
 * Returns `true` for the exclusive-create collision raised by a concurrent writer.
 */
function isAlreadyExistingFileError(error: unknown): boolean {
    return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'EEXIST');
}
