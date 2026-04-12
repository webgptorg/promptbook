import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname } from 'path/posix';
import type { RunGoScriptOptions } from './RunGoScriptOptions';

/**
 * Creates a temporary script file, runs a handler, and ensures cleanup.
 */
export async function withTempScript<T>(options: RunGoScriptOptions, handler: (scriptPath: string) => Promise<T>): Promise<T> {
    const { scriptPath, scriptContent } = options;

    await mkdir(dirname(scriptPath), { recursive: true });
    await writeFile(scriptPath, scriptContent, 'utf-8');

    const result = await handler(scriptPath);
    await unlink(scriptPath).catch(() => undefined);
    return result;
}
