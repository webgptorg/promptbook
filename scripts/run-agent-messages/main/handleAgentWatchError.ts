import colors from 'colors';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import moment from 'moment';
import { spaceTrim } from 'spacetrim';
import { formatUnknownErrorDetails } from '../../run-codex-prompts/common/formatUnknownErrorDetails';

/**
 * Additional execution context captured for agent watch-loop failures.
 */
export type AgentWatchErrorContext = {
    readonly projectPath?: string;
    readonly queuedMessageRelativePath?: string;
    readonly scriptPath?: string;
    readonly runtimeLogPath?: string;
};

/**
 * Symbol-keyed error metadata used to preserve watch-loop diagnostics across rethrows.
 */
const AGENT_WATCH_ERROR_CONTEXT_SYMBOL = Symbol('AGENT_WATCH_ERROR_CONTEXT_SYMBOL');

/**
 * Error instance extended with captured watch-loop diagnostics.
 */
type ErrorWithAgentWatchContext = Error & {
    [AGENT_WATCH_ERROR_CONTEXT_SYMBOL]?: AgentWatchErrorContext;
};

/**
 * Attaches watch-loop context to an error-like value while preserving the original error instance when possible.
 */
export function withAgentWatchErrorContext(error: unknown, context: AgentWatchErrorContext): Error {
    const normalizedError = normalizeAgentWatchError(error);
    const contextualError = normalizedError as ErrorWithAgentWatchContext;

    contextualError[AGENT_WATCH_ERROR_CONTEXT_SYMBOL] = {
        ...contextualError[AGENT_WATCH_ERROR_CONTEXT_SYMBOL],
        ...context,
    };

    return normalizedError;
}

/**
 * Handles one recoverable watch-loop failure by writing a detailed cwd log and printing a concise continuation notice.
 */
export async function handleAgentWatchError(options: {
    readonly commandDisplayName: string;
    readonly logDirectoryPath: string;
    readonly error: unknown;
}): Promise<void> {
    const { commandDisplayName, logDirectoryPath, error } = options;
    const errorDetails = formatUnknownErrorDetails(error);
    const errorContext = getAgentWatchErrorContext(error);
    const errorLogPath = join(
        logDirectoryPath,
        `ptbk-agent-error-${moment().utc().format('YYYY-MM-DDTHH-mm-ss-SSS[Z]')}.log`,
    );
    const runtimeLogContents = await readRuntimeLogIfAvailable(errorContext?.runtimeLogPath);
    const errorLog = spaceTrim(
        (block) => `
            Timestamp: ${moment().toISOString()}
            Command: ${commandDisplayName}
            Working directory: ${logDirectoryPath}
            Project path: ${errorContext?.projectPath || logDirectoryPath}
            Queued message: ${errorContext?.queuedMessageRelativePath || '(unknown)'}
            Script path: ${errorContext?.scriptPath || '(unknown)'}
            Runtime log path: ${errorContext?.runtimeLogPath || '(unavailable)'}

            Error details:
            ${block(errorDetails)}

            Full bash history and raw shell output:
            ${block(runtimeLogContents || 'Unavailable for this failure.')}
        `,
    );

    console.error(colors.red(errorDetails));

    try {
        await writeFile(errorLogPath, errorLog, 'utf-8');
        console.error(colors.yellow(`Logged recoverable watcher failure to ${errorLogPath}. Continuing to watch...`));
    } catch (logWriteError) {
        console.error(
            colors.yellow(
                `Failed to write recoverable watcher failure log to ${errorLogPath}: ${formatUnknownErrorDetails(logWriteError)}`,
            ),
        );
        console.error(colors.yellow('Continuing to watch without a persisted failure log.'));
    }
}

/**
 * Reads the preserved runtime log for a failed queued-message shell run when available.
 */
async function readRuntimeLogIfAvailable(runtimeLogPath: string | undefined): Promise<string | undefined> {
    if (!runtimeLogPath) {
        return undefined;
    }

    try {
        return await readFile(runtimeLogPath, 'utf-8');
    } catch {
        return undefined;
    }
}

/**
 * Recovers previously attached watch-loop context from an error-like value.
 */
function getAgentWatchErrorContext(error: unknown): AgentWatchErrorContext | undefined {
    if (!(error instanceof Error)) {
        return undefined;
    }

    return (error as ErrorWithAgentWatchContext)[AGENT_WATCH_ERROR_CONTEXT_SYMBOL];
}

/**
 * Normalizes an unknown thrown value into a real `Error` instance.
 */
function normalizeAgentWatchError(error: unknown): Error {
    return error instanceof Error ? error : new Error(formatUnknownErrorDetails(error));
}

