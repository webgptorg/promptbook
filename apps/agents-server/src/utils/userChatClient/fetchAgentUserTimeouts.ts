'use client';

import type { AgentUserTimeoutListResponse } from '../userChatClient';
import { requestUserChatApi } from './requestUserChatApi';

/**
 * Loads every planned message of one agent, as listed in its goal chat.
 *
 * @private shared helper for the Agents Server browser client
 */
export async function fetchAgentUserTimeouts(agentName: string): Promise<AgentUserTimeoutListResponse> {
    return await requestUserChatApi<AgentUserTimeoutListResponse>(
        `/agents/${encodeURIComponent(agentName)}/api/timeouts`,
        {
            method: 'GET',
            cache: 'no-store',
        },
        'Failed to load planned messages.',
    );
}
