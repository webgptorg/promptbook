import { $execCommand } from '../../../../src/utils/execCommand/$execCommand';
import type { RunGoScriptOptions } from './RunGoScriptOptions';
import { toPosixPath } from './toPosixPath';
import { withTempScript } from './withTempScript';

/**
 * Creates a temporary script file, runs it, captures output, and then deletes it.
 */
export async function $runGoScriptWithOutput(options: RunGoScriptOptions): Promise<string> {
    return await withTempScript(options, async (scriptPath) => {
        return await $execCommand({
            command: `bash "${toPosixPath(scriptPath)}"`,
            isVerbose: true, // <- Note: Proxy the raw command output to the console
        });
    });
}
