import { basename } from 'path';
import { resolvePromptbookTemporaryPath } from '../filesystem/promptbookTemporaryPath';

/**
 * Temporary subdirectory used for agent-message runner shell scripts.
 *
 * @private internal constant of agent-message runtime paths
 */
export const AGENT_MESSAGE_SCRIPT_DIRECTORY_NAME = 'agent-messages';

/**
 * File extension used for temporary prompt-runner shell scripts.
 *
 * @private internal constant of agent-message runtime paths
 */
const AGENT_MESSAGE_SCRIPT_EXTENSION = '.sh';

/**
 * File extension used for temporary prompt-runner live logs.
 *
 * @private internal constant of agent-message runtime paths
 */
const AGENT_MESSAGE_RUNTIME_LOG_EXTENSION = '.log.txt';

/**
 * Builds the temporary shell script path used by one queued agent-message harness run.
 *
 * @param projectPath - Local agent project path containing the message queue.
 * @param sourceFileName - Queued message filename used to name the temporary shell script.
 * @returns Temporary shell script path.
 * @private internal utility of agent-message runners
 */
export function buildAgentMessageScriptPathFromFileName(projectPath: string, sourceFileName: string): string {
    const sourceFileBasename = basename(sourceFileName);
    const scriptFileName = `${sourceFileBasename.replace(/\.[^.]+$/u, '')}${AGENT_MESSAGE_SCRIPT_EXTENSION}`;

    return resolvePromptbookTemporaryPath(projectPath, AGENT_MESSAGE_SCRIPT_DIRECTORY_NAME, scriptFileName);
}

/**
 * Builds the live runtime log path used by one queued agent-message harness run.
 *
 * @param projectPath - Local agent project path containing the message queue.
 * @param sourceFileName - Queued message filename used to name the temporary shell script.
 * @returns Temporary live runtime log path.
 * @private internal utility of agent-message runners
 */
export function buildAgentMessageRuntimeLogPathFromFileName(projectPath: string, sourceFileName: string): string {
    return buildAgentMessageScriptPathFromFileName(projectPath, sourceFileName).replace(
        new RegExp(`${escapeRegExp(AGENT_MESSAGE_SCRIPT_EXTENSION)}$`, 'iu'),
        AGENT_MESSAGE_RUNTIME_LOG_EXTENSION,
    );
}

/**
 * Escapes one literal string for safe `RegExp` construction.
 *
 * @param value - Literal string to escape.
 * @returns Escaped regular-expression fragment.
 * @private internal utility of agent-message runtime paths
 */
function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

// Note: [💞] Ignore a discrepancy between file name and entity name
