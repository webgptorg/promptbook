import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname } from 'path/posix';
import type { RunGoScriptOptions } from './RunGoScriptOptions';
import { getPromptRoundArtifactKindFromScriptPath } from './PromptRoundArtifacts';

/**
 * Creates a temporary script file, runs a handler, and either cleans it up immediately or defers cleanup to the round tracker.
 */
export async function withTempScript<T>(options: RunGoScriptOptions, handler: (scriptPath: string) => Promise<T>): Promise<T> {
    const { scriptPath, scriptContent, promptRoundArtifacts } = options;

    await mkdir(dirname(scriptPath), { recursive: true });
    await writeFile(scriptPath, scriptContent, 'utf-8');
    promptRoundArtifacts?.track(scriptPath, getPromptRoundArtifactKindFromScriptPath(scriptPath));

    try {
        return await handler(scriptPath);
    } finally {
        if (!promptRoundArtifacts) {
            await unlink(scriptPath).catch(() => undefined);
        }
    }
}
