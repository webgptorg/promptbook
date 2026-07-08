import { mkdir, open, readFile, stat, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { resolveVpsEnvironmentFilePath } from '../vpsConfiguration';

/**
 * Resolves the filesystem path of the persisted self-update log file.
 *
 * @returns Absolute log-file path.
 *
 * @private function of `vpsSelfUpdate`
 */
export function resolveVpsSelfUpdateLogFilePath(): string {
    return resolve(resolveVpsSelfUpdateStateDirectory(), 'self-update.log');
}

/**
 * Resolves the filesystem path of the persisted self-update database migration summary file.
 *
 * @returns Absolute migration-summary file path.
 *
 * @private function of `vpsSelfUpdate`
 */
export function resolveVpsSelfUpdateDatabaseMigrationSummaryFilePath(): string {
    return resolve(resolveVpsSelfUpdateStateDirectory(), 'self-update-database-migrations.json');
}

/**
 * Resolves the filesystem path of the persisted self-update status file.
 *
 * @returns Absolute status-file path.
 *
 * @private function of `vpsSelfUpdate`
 */
export function resolveVpsSelfUpdateStatusFilePath(): string {
    return resolve(resolveVpsSelfUpdateStateDirectory(), 'self-update.status');
}

/**
 * Encodes one free-form status field into base64 for the shell-owned status file.
 *
 * @param value - Raw string value.
 * @returns Base64-encoded value.
 *
 * @private function of `vpsSelfUpdate`
 */
export function encodeStatusField(value: string): string {
    return Buffer.from(value, 'utf-8').toString('base64');
}

/**
 * Reads the full persisted standalone VPS self-update log so the super admin can copy/download it for debugging.
 *
 * @returns Log file content or `null` when the file does not exist yet.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function readVpsSelfUpdateLogFileContent(): Promise<string | null> {
    const logFilePath = resolveVpsSelfUpdateLogFilePath();
    try {
        return await readFile(logFilePath, 'utf-8');
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return null;
        }
        throw error;
    }
}

/**
 * Reads the persisted shell-owned status file.
 *
 * @returns Parsed key/value entries.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function readVpsSelfUpdateStatusFile(): Promise<Map<string, string>> {
    const statusFilePath = resolveVpsSelfUpdateStatusFilePath();
    try {
        const rawContent = await readFile(statusFilePath, 'utf-8');
        return new Map(
            rawContent
                .split(/\r?\n/u)
                .map((line) => line.trim())
                .filter((line) => line !== '' && !line.startsWith('#'))
                .map((line) => {
                    const separatorIndex = line.indexOf('=');
                    if (separatorIndex === -1) {
                        return [line, ''] as const;
                    }

                    return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)] as const;
                }),
        );
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return new Map();
        }
        throw error;
    }
}

/**
 * Writes the minimal initial status file before the detached installer takes over.
 *
 * @param entries - Flat status-file fields.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function writeVpsSelfUpdateStatusFile(entries: Readonly<Record<string, string>>): Promise<void> {
    const statusFilePath = resolveVpsSelfUpdateStatusFilePath();
    await mkdir(dirname(statusFilePath), { recursive: true });
    await writeFile(
        statusFilePath,
        `${Object.entries(entries)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n')}\n`,
        'utf-8',
    );
}

/**
 * Decodes one optional base64-encoded status field.
 *
 * @param value - Base64 string or `undefined`.
 * @returns Decoded UTF-8 text or `null`.
 *
 * @private function of `vpsSelfUpdate`
 */
export function decodeVpsSelfUpdateStatusField(value: string | undefined): string | null {
    if (!value) {
        return null;
    }

    try {
        return Buffer.from(value, 'base64').toString('utf-8') || null;
    } catch {
        return null;
    }
}

/**
 * Reads the trailing chunk of a text log file for the browser UI.
 *
 * @param filePath - File to tail.
 * @param byteLimit - Maximum bytes to read from the end of the file.
 * @returns UTF-8 tail text or `null` when missing.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function readLastVpsSelfUpdateTextFileChunk(
    filePath: string | null,
    byteLimit = 32768,
): Promise<string | null> {
    if (!filePath) {
        return null;
    }

    try {
        const fileHandle = await open(filePath, 'r');
        try {
            const fileStats = await stat(filePath);
            const readLength = Math.min(fileStats.size, byteLimit);
            const offset = Math.max(0, fileStats.size - readLength);
            const buffer = Buffer.alloc(readLength);
            const { bytesRead } = await fileHandle.read(buffer, 0, readLength, offset);
            const text = buffer.subarray(0, bytesRead).toString('utf-8');
            return offset > 0 ? text.replace(/^[^\n]*\n/u, '') : text;
        } finally {
            await fileHandle.close();
        }
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return null;
        }
        throw error;
    }
}

/**
 * Resolves the state-directory path used for persistent update logs and status files.
 *
 * @returns Absolute directory path.
 */
function resolveVpsSelfUpdateStateDirectory(): string {
    return resolve(dirname(resolveVpsEnvironmentFilePath()), '.promptbook', 'self-update');
}
