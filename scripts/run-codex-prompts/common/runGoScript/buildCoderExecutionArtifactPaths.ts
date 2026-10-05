import { buildScriptLogPath } from './buildScriptLogPath';

/** Known wrapper/check/log artifacts shared by a round's ownership, finalization and isolated recovery. */
export function buildCoderExecutionArtifactPaths(scriptPath: string): ReadonlyArray<string> {
    return [scriptPath, buildScriptLogPath(scriptPath), scriptPath.replace(/\.sh$/iu, '.check.sh')];
}
