import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { resolveVpsSelfUpdateStatusFilePath } from './vpsSelfUpdateStatePaths';

/**
 * Encodes one free-form status field into base64 for the shell-owned status file.
 *
 * @param value - Raw string value.
 * @returns Base64-encoded value.
 */
export function encodeStatusField(value: string): string {
    return Buffer.from(value, 'utf-8').toString('base64');
}

/**
 * Decodes one optional base64-encoded status field.
 *
 * @param value - Base64 string or `undefined`.
 * @returns Decoded UTF-8 text or `null`.
 *
 * @private function of `vpsSelfUpdate`
 */
export function decodeStatusField(value: string | undefined): string | null {
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
