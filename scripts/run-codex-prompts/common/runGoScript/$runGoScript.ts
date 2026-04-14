import type { RunGoScriptOptions } from './RunGoScriptOptions';
import { runShellCommandWithOutput } from './runShellCommandWithOutput';
import { toPosixPath } from './toPosixPath';
import { withTempScript } from './withTempScript';

/**
 * Creates a temporary script file, runs it, and then deletes it.
 */
export async function $runGoScript(options: RunGoScriptOptions): Promise<void> {
    await withTempScript(options, async (scriptPath) => {
        await runShellCommandWithOutput({
            command: `bash "${toPosixPath(scriptPath)}"`,
        });
    });
}
