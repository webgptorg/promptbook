import type { RunGoScriptOptions } from './RunGoScriptOptions';
import { runShellCommandWithOutput } from './runShellCommandWithOutput';
import { toPosixPath } from './toPosixPath';
import { withTempScript } from './withTempScript';

/**
 * Creates a temporary script file, runs it, captures output, and then deletes it.
 */
export async function $runGoScriptWithOutput(options: RunGoScriptOptions): Promise<string> {
    return await withTempScript(options, async (scriptPath) => {
        return await runShellCommandWithOutput({
            command: `bash "${toPosixPath(scriptPath)}"`,
        });
    });
}
