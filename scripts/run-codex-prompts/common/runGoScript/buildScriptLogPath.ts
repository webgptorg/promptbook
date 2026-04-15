/**
 * Builds the temporary live runtime log path for one prompt script and its sibling test script.
 */
export function buildScriptLogPath(scriptPath: string): string {
    const basePath = scriptPath.replace(/\.test\.sh$/iu, '').replace(/\.sh$/iu, '');
    return `${basePath}.log.txt`;
}
