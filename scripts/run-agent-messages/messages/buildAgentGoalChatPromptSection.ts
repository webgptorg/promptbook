import { spaceTrim } from 'spacetrim';
import { USER_CHAT_WORKER_TOKEN_HEADER } from '../../../apps/agents-server/src/utils/agentProjects/agentProjectRuntimeConstants';
import { AGENT_GOAL_CHAT_PLANNED_MESSAGES_INTERNAL_API_PATH } from '../../../apps/agents-server/src/utils/agentGoalChat/agentGoalChatConstants';
import type { AgentServerRuntimePromptApi } from './AgentServerRuntimePromptApi';

/**
 * Builds the planned-message instructions available to an Agents Server-managed coding agent.
 *
 * Planned messages always target the agent's singleton goal chat, regardless of the chat in which
 * the command is invoked.
 */
export function buildAgentGoalChatPromptSection(runtimeApi: AgentServerRuntimePromptApi | undefined): string {
    if (!runtimeApi) {
        return '';
    }

    return spaceTrim(`
        ## Planned goal-chat messages

        You can plan a future message that wakes you in your singleton goal chat. These commands are available during every Agents Server-managed chat invocation, not only while answering inside the goal chat.

        - Use \`list_timeouts\` before planning follow-up work so you do not create duplicates.
        - Use \`set_timeout\` when useful work should resume later. The delay is a positive number of milliseconds and the message should say exactly what your future invocation needs to do.
        - Use \`cancel_timeout\` with the returned \`timeoutId\` when a planned message is no longer useful.
        - A fired message appears in the goal chat and invokes you there. If more future work remains, plan the next useful message during that invocation.

        Run the corresponding authenticated command:

        \`\`\`bash
        # list_timeouts
        curl -sS -X POST "$${runtimeApi.serverUrlEnvironmentVariableName}${AGENT_GOAL_CHAT_PLANNED_MESSAGES_INTERNAL_API_PATH}" \\
          -H "Content-Type: application/json" \\
          -H "${USER_CHAT_WORKER_TOKEN_HEADER}: $${runtimeApi.tokenEnvironmentVariableName}" \\
          -d '{"action":"list","agentPermanentId":"${runtimeApi.agentPermanentId}"}'

        # set_timeout
        curl -sS -X POST "$${runtimeApi.serverUrlEnvironmentVariableName}${AGENT_GOAL_CHAT_PLANNED_MESSAGES_INTERNAL_API_PATH}" \\
          -H "Content-Type: application/json" \\
          -H "${USER_CHAT_WORKER_TOKEN_HEADER}: $${runtimeApi.tokenEnvironmentVariableName}" \\
          -d '{"action":"set","agentPermanentId":"${runtimeApi.agentPermanentId}","milliseconds":3600000,"message":"Continue the current goal and decide the next concrete action."}'

        # cancel_timeout
        curl -sS -X POST "$${runtimeApi.serverUrlEnvironmentVariableName}${AGENT_GOAL_CHAT_PLANNED_MESSAGES_INTERNAL_API_PATH}" \\
          -H "Content-Type: application/json" \\
          -H "${USER_CHAT_WORKER_TOKEN_HEADER}: $${runtimeApi.tokenEnvironmentVariableName}" \\
          -d '{"action":"cancel","agentPermanentId":"${runtimeApi.agentPermanentId}","timeoutId":"<timeout-id>"}'
        \`\`\`
    `);
}
