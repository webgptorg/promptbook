import { readFile } from 'node:fs/promises';

/** Read credential configuration privately; only a boolean or model identifier leaves this helper. @private */
export async function privateConfiguration(path: string): Promise<Record<string, unknown> | undefined> {
    try {
        const bytes = await readFile(path);
        if (bytes.length > 1024 * 1024) return undefined;
        return JSON.parse(bytes.toString('utf8')) as Record<string, unknown>;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT' || error instanceof SyntaxError) return undefined;
        throw error;
    }
}


/** Detect configured secret material without returning its value or putting it in a trace. @private */
export function hasCredential(value: unknown): boolean {
    if (!value || typeof value !== 'object') return false;
    return Object.entries(value).some(([name, entry]) => typeof entry === 'string' && entry.length > 0 && /api.?key|access.?token|refresh.?token|authorization/i.test(name) || typeof entry === 'object' && hasCredential(entry));
}

