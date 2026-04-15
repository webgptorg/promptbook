import type { RunGoScriptOptions } from './RunGoScriptOptions';
import { runBashScriptWithOutput } from './runBashScriptWithOutput';
import { withTempScript } from './withTempScript';

/**
 * Creates a temporary script file, runs it, and then deletes it.
 */
export async function $runGoScript(options: RunGoScriptOptions): Promise<void> {
    await withTempScript(options, async (scriptPath) => {
        await runBashScriptWithOutput({
            ...options,
            scriptPath,
        });
    });
}
