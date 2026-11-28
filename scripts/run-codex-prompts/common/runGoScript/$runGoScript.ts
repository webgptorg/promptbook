import type { RunGoScriptOptions } from './RunGoScriptOptions';
import { runBashScriptWithOutput } from './runBashScriptWithOutput';
import { withTempScript } from './withTempScript';

/**
 * Creates a temporary script file, runs it, and cleans it up unless preservation is requested or the run fails.
 */
export async function $runGoScript(options: RunGoScriptOptions): Promise<void> {
    await withTempScript(options, async (scriptPath) => {
        await runBashScriptWithOutput({
            ...options,
            scriptPath,
        });
    });
}
