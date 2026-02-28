'use client';
// <- Note: [👲] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

/* Context removed – using attachable sendMessage from hook */
import spaceTrim from 'spacetrim';
import { Color, saturate } from '../../../_packages/color.index';
import { PROMPTBOOK_COLOR } from '../../../config';
import { asUpdatableSubject } from '../../../types/Updatable';
import { resolveAgentAvatarImageUrl } from '../../../utils/agents/resolveAgentAvatarImageUrl';
import { $getCurrentDate } from '../../../utils/misc/$getCurrentDate';
import type { TODO_any } from '../../../utils/organization/TODO_any';
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
    const { agent, title, persistenceKey, onChange, sendMessage, toolTitles, teamAgentProfiles, ...restProps } = props;

    const brandColor = Color.fromSafe(agent.meta.color || PROMPTBOOK_COLOR).then(saturate(-0.2));
    const agentAvatarUrl = resolveAgentAvatarImageUrl({ agent });
    const elevenLabsVoiceId = agent.meta.voice;

    return (
        <>
            <LlmChat
                title={title || `Chat with ${agent.meta.fullname || agent.agentName || 'Agent'}`}
                persistenceKey={persistenceKey || `agent-chat-${agent.agentName}`}
                userParticipantName="USER"
                llmParticipantName="AGENT" // <- TODO: [🧠] Maybe dynamic agent id
                initialMessages={[
                    {
                        // channel: 'PROMPTBOOK_CHAT',
                        sender: 'AGENT',
                        content:
                            agent.initialMessage ||
                            spaceTrim(`
                                
                        Hello! I am ${agent.meta.fullname || agent.agentName || 'an AI Agent'}.
                        
                        [Hello](?message=Hello, can you tell me about yourself?)
                    `),
                        createdAt: $getCurrentDate(),
                    },
                ]}
                participants={[
                    {
                        name: 'AGENT',
                        fullname: agent.meta.fullname || agent.agentName || 'Agent',
                        avatarSrc: agentAvatarUrl || undefined,
                        color: brandColor,
                        isMe: false,
                        agentSource: asUpdatableSubject(agent.agentSource).getValue() /* <- TODO: [🐱‍🚀] asValue */,
                        knowledgeSources: (agent as TODO_any).knowledgeSources,
                    },
                    {
                        name: 'USER',
                        fullname: 'User',
                        color: '#115EB6',
                        isMe: true,
                    },
                ]}
                buttonColor={brandColor}
                {...{ llmTools: agent, onChange, sendMessage, toolTitles, teamAgentProfiles }}
                elevenLabsVoiceId={elevenLabsVoiceId}
                {...restProps}
            />
        </>
    );
}

/**
 * TODO: !!!! Search ACRY ".meta.color" and make sure that we count that we count color can be array
 */
