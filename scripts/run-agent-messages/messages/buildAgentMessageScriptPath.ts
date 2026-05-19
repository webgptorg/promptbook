import { buildTemporaryPromptScriptPath } from '../../run-codex-prompts/common/runGoScript/buildTemporaryPromptScriptPath';
import type { AgentMessageFile } from './AgentMessageFile';

/**
 * Temporary subdirectory used for agent-message runner shell scripts.
 */
const AGENT_MESSAGE_SCRIPT_DIRECTORY_NAME = 'agent-messages';

/**
 * Builds a temporary script path for one agent message runner invocation.
 */
export function buildAgentMessageScriptPath(projectPath: string, messageFile: AgentMessageFile): string {
    return buildTemporaryPromptScriptPath({
        projectPath,
        scriptDirectoryName: AGENT_MESSAGE_SCRIPT_DIRECTORY_NAME,
        sourceFileName: messageFile.fileName,
    });
}
