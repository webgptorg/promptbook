import { buildAgentMessageScriptPathFromFileName } from '../../../src/utils/agent-message-runtime/agentMessageRuntimePaths';
import type { AgentMessageFile } from './AgentMessageFile';

/**
 * Builds a temporary script path for one agent message runner invocation.
 */
export function buildAgentMessageScriptPath(projectPath: string, messageFile: AgentMessageFile): string {
    return buildAgentMessageScriptPathFromFileName(projectPath, messageFile.fileName);
}
