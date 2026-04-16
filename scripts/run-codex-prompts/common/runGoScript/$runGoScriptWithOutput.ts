import type { RunGoScriptOptions } from './RunGoScriptOptions';
import { runBashScriptWithOutput } from './runBashScriptWithOutput';
import { withTempScript } from './withTempScript';

/**
 * Creates a temporary script file, runs it, captures output, and cleans it up unless preservation is requested or the run fails.
 */
export async function $runGoScriptWithOutput(options: RunGoScriptOptions): Promise<string> {
    return await withTempScript(options, async (scriptPath) => {
        return await runBashScriptWithOutput({
            ...options,
            scriptPath,
        });
    });
}
