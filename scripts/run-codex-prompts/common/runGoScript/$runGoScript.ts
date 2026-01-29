import { $execCommand } from '../../../../src/utils/execCommand/$execCommand';
import type { RunGoScriptOptions } from './RunGoScriptOptions';
import { toPosixPath } from './toPosixPath';
import { withTempScript } from './withTempScript';

/**
 * Creates a temporary script file, runs it, and then deletes it.
 */
export async function $runGoScript(options: RunGoScriptOptions): Promise<void> {
    await withTempScript(options, async (scriptPath) => {
        await $execCommand({
            command: `bash "${toPosixPath(scriptPath)}"`,
            isVerbose: true, // <- Note: Proxy the raw command output to the console
        });
    });
}
