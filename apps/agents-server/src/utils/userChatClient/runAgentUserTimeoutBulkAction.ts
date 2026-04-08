'use client';

import type { AgentUserTimeoutBulkAction, AgentUserTimeoutBulkActionResponse } from '../userChatClient';
import { requestUserChatApi } from './requestUserChatApi';

/**
 * Executes one bulk timeout action in the agent-wide timeout manager.
 *
 * @private shared helper for the Agents Server browser client
 */
export async function runAgentUserTimeoutBulkAction(
    agentName: string,
    action: AgentUserTimeoutBulkAction,
): Promise<AgentUserTimeoutBulkActionResponse> {
    return await requestUserChatApi<AgentUserTimeoutBulkActionResponse>(
        `/agents/${encodeURIComponent(agentName)}/api/timeouts/actions`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
        },
        'Failed to execute timeout bulk action.',
    );
}
