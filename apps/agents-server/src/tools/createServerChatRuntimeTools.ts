import type { ChatMessage, LlmToolDefinition } from '@promptbook-local/types';
import { createAgentGoalChatTimeoutTools } from './agentGoalChatTimeoutTools';
import { createAgentProgressTools } from './createAgentProgressTools';
import { createChatAttachmentTools } from './createChatAttachmentTools';

/**
 * Composes the runtime-only tools shared by Agents Server web chat execution paths.
 *
 * @param attachments - Files attached to the current chat turn.
 * @param existingTools - Additional request-scoped tools to preserve.
 * @returns Deduplicated server runtime tool definitions.
 */
export function createServerChatRuntimeTools(
    attachments: ChatMessage['attachments'] = [],
    existingTools: ReadonlyArray<LlmToolDefinition> = [],
): Array<LlmToolDefinition> {
    return createAgentProgressTools(
        createAgentGoalChatTimeoutTools(createChatAttachmentTools(existingTools, attachments || [])),
    );
}
