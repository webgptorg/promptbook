'use client';
// <- Note: [👲] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

import { useMemo } from 'react';
/* Context removed – using attachable sendMessage from hook */
import spaceTrim from 'spacetrim';
import { asUpdatableSubject } from '../../../types/Updatable';
import { LlmChat } from '../LlmChat/LlmChat';
import type { AgentChatProps } from './AgentChatProps';

/**
 * AgentChat component that provides chat functionality with LLM integration
 *
 * This component internally manages messages, participants, and task progress,
 * and uses the provided LLM tools to generate responses via `LlmExecutionTools.callChatModel`.
 *
 * Note: There are multiple chat components:
 * - `<Chat/>` renders chat as it is without any logic
 * - `<AgentChat/>` connected to LLM Execution Tools of Promptbook
 *
 * @public exported from `@promptbook/components`
 */
export function AgentChat(props: AgentChatProps) {
    const { agent, title, persistenceKey, onChange, sendMessage, ...restProps } = props;

    const llmTools = useMemo(() => {
        const llmTools = agent.getLlmExecutionTools();
        return llmTools;
    }, [agent]);

    return (
        <LlmChat
            title={title || `Chat with ${agent.agentName || 'Agent'}`}
            persistenceKey={persistenceKey || `agent-chat-${agent.agentName || '!!!!!remove'}`}
            userParticipantName="USER"
            llmParticipantName="AGENT" // <- TODO: [🧠] Maybe dynamic agent id
            initialMessages={[
                {
                    from: 'AGENT',
                    content: spaceTrim(`
                                
                        Hello! I am ${agent.agentName || 'an AI Agent'}.
                        
                        [Hello](?message=Hello, can you tell me about yourself?)
                    `),
                },
            ]}
            participants={[
                {
                    name: 'AGENT',
                    fullname: agent.agentName || 'Agent',
                    avatarSrc: agent.meta.image,
                    color: agent.meta.color,
                    isMe: false,
                    agentSource: asUpdatableSubject(agent.agentSource).getValue() /* <- TODO: !!!!! asValue */,
                },
                {
                    name: 'USER',
                    fullname: 'User',
                    color: '#115EB6',
                    isMe: true,
                },
            ]}
            {...{ llmTools, onChange, sendMessage }}
            {...restProps}
        />
    );
}
