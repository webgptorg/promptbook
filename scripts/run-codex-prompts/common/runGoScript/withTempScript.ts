import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname } from 'path/posix';
import type { RunGoScriptOptions } from './RunGoScriptOptions';
import { shouldDeleteTemporaryArtifact } from './shouldDeleteTemporaryArtifact';

/**
 * Creates a temporary script file, runs a handler, and cleans it up unless preservation is requested or the run fails.
 */
export async function withTempScript<T>(options: RunGoScriptOptions, handler: (scriptPath: string) => Promise<T>): Promise<T> {
    const { scriptPath, scriptContent } = options;
    let hasFailed = false;

    await mkdir(dirname(scriptPath), { recursive: true });
    await writeFile(scriptPath, scriptContent, 'utf-8');

    try {
        return await handler(scriptPath);
    } catch (error) {
        hasFailed = true;
        throw error;
    } finally {
        if (shouldDeleteTemporaryArtifact({ preserveArtifactsOnSuccess: options.preserveArtifactsOnSuccess, hasFailed })) {
            await unlink(scriptPath).catch(() => undefined);
        }
    }
}
