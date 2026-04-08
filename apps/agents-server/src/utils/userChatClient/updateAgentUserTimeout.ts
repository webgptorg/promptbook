'use client';

import type { AgentUserTimeoutUpdatePayload, UserChatTimeout } from '../userChatClient';
import { requestUserChatApi } from './requestUserChatApi';

/**
 * Updates one durable timeout in the agent-wide timeout manager.
 *
 * @private shared helper for the Agents Server browser client
 */
export async function updateAgentUserTimeout(
    agentName: string,
    timeoutId: string,
    payload: AgentUserTimeoutUpdatePayload,
): Promise<UserChatTimeout> {
    return await requestUserChatApi<UserChatTimeout>(
        `/agents/${encodeURIComponent(agentName)}/api/timeouts/${encodeURIComponent(timeoutId)}`,
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        },
        'Failed to update agent timeout.',
    );
}
