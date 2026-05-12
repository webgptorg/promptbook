import { resolvePromptbookTempPath } from '../../../src/utils/files/getPromptbookTempPath';
import type { AgentMessageFile } from './AgentMessageFile';

/**
 * Builds a temporary script path for one agent message runner invocation.
 */
export function buildAgentMessageScriptPath(projectPath: string, messageFile: AgentMessageFile): string {
    const scriptFileName = `${messageFile.fileName.replace(/\.[^.]+$/u, '')}.sh`;
    return resolvePromptbookTempPath(projectPath, 'scripts', 'agent-messages', scriptFileName);
}
