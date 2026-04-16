import type { RunGoScriptUntilMarkerIdleOptions } from './RunGoScriptUntilMarkerIdleOptions';
import { runScriptUntilMarkerIdle } from './runScriptUntilMarkerIdle';
import { withTempScript } from './withTempScript';

/**
 * Creates a temporary script file, runs it, waits for a completion marker and idle time, and cleans it up unless preservation is requested or the run fails.
 * Returns the captured output for post-processing.
 */
export async function $runGoScriptUntilMarkerIdle(options: RunGoScriptUntilMarkerIdleOptions): Promise<string> {
    return await withTempScript(options, async (scriptPath) => {
        return await runScriptUntilMarkerIdle({
            scriptPath,
            scriptContent: options.scriptContent,
            completionLineMatcher: options.completionLineMatcher,
            idleTimeoutMs: options.idleTimeoutMs,
            logPath: options.logPath,
        });
    });
}
