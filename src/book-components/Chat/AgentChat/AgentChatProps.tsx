'use client';
import { Agent } from '../../../llm-providers/agent/Agent';
// <- Note: [👲] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

import type { LlmChatProps } from '../LlmChat/LlmChatProps';

/**
 * Props for AgentChat component, derived from LlmChatProps but with Agent-specific modifications
 *
 * @public exported from `@promptbook/components`
 */
export type AgentChatProps = Omit<
    LlmChatProps,
    'thread' | 'llmTools' | 'initialMessages' | 'userParticipantName' | 'llmParticipantName'
> & {
    /**
     * The agent to chat with
     */
    readonly agent: Agent;
};
