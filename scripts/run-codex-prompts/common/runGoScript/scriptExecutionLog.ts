import { appendFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { formatUnknownErrorDetails } from '../formatUnknownErrorDetails';
import { toPosixPath } from './toPosixPath';

/**
 * Environment variable read by the shell wrapper to tee live output into the temporary runtime log file.
 */
export const PTBK_CODER_LOG_FILE_ENV_NAME = 'PTBK_CODER_LOG_FILE';

/**
 * Small bash wrapper that preserves stdout/stderr streams while teeing both into the runtime log file.
 */
const LOGGED_BASH_WRAPPER_COMMAND = `
if [ -n "\${${PTBK_CODER_LOG_FILE_ENV_NAME}:-}" ]; then
    exec > >(tee -a "\$${PTBK_CODER_LOG_FILE_ENV_NAME}") 2> >(tee -a "\$${PTBK_CODER_LOG_FILE_ENV_NAME}" >&2)
fi
bash "$1"
`.trim();

/**
 * Shapes one bash invocation that optionally mirrors live script output into a temporary log file.
 */
export function buildLoggedBashExecution(scriptPath: string, logPath?: string): {
    args: string[];
    env?: Record<string, string>;
} {
    return {
        args: ['-lc', LOGGED_BASH_WRAPPER_COMMAND, 'ptbk-coder-temp-script', toPosixPath(scriptPath)],
        env: logPath ? { [PTBK_CODER_LOG_FILE_ENV_NAME]: toPosixPath(logPath) } : undefined,
    };
}

/**
 * Appends one execution-start section with the raw script input before the shell begins producing output.
 */
export async function appendScriptExecutionLogStart({
    scriptPath,
    scriptContent,
    logPath,
}: {
    scriptPath: string;
    scriptContent: string;
    logPath?: string;
}): Promise<void> {
    if (!logPath) {
        return;
    }

    await mkdir(dirname(logPath), { recursive: true });

    const scriptKind = describeTempScriptKind(scriptPath);
    const normalizedInput = scriptContent.replace(/\r\n/g, '\n').trimEnd();
    const logSection = [
        `=== ${scriptKind} started at ${new Date().toISOString()} ===`,
        `Script path: ${toPosixPath(scriptPath)}`,
        '',
        '--- raw input ---',
        normalizedInput,
        '',
        '--- raw output ---',
        '',
    ].join('\n');

    await appendFile(logPath, `${logSection}\n`, 'utf-8');
}

/**
 * Appends one execution-finish section after the shell settles.
 */
export async function appendScriptExecutionLogFinish({
    scriptPath,
    logPath,
    status,
    details,
}: {
    scriptPath: string;
    logPath?: string;
    status: string;
    details?: unknown;
}): Promise<void> {
    if (!logPath) {
        return;
    }

    const scriptKind = describeTempScriptKind(scriptPath);
    const logLines = [
        '',
        `=== ${scriptKind} finished at ${new Date().toISOString()} ===`,
        `Status: ${status}`,
    ];

    if (details !== undefined) {
        logLines.push('');
        logLines.push('--- details ---');
        logLines.push(formatUnknownErrorDetails(details));
    }

    logLines.push('');
    await appendFile(logPath, `${logLines.join('\n')}\n`, 'utf-8');
}

/**
 * Distinguishes prompt-runner and verification temp shells in the shared runtime log.
 */
function describeTempScriptKind(scriptPath: string): 'runner shell' | 'test shell' {
    return scriptPath.toLowerCase().endsWith('.test.sh') ? 'test shell' : 'runner shell';
}
