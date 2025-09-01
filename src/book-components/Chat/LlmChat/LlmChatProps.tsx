'use client';
import type { LlmExecutionTools } from '../../../execution/LlmExecutionTools';
import type { ChatProps } from '../Chat/ChatProps';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';

/**
 * Props for LlmChat component, derived from ChatProps but with LLM-specific modifications
 *
 * @public exported from `@promptbook/components`
 */

export type LlmChatProps = Omit<ChatProps, 'messages' | 'onMessage' | 'onChange'> & {
    /**
     * LLM execution tools for chatting with the model
     */
    readonly llmTools: LlmExecutionTools;

    /**
     * Optional key for persisting conversation in localStorage
     * When provided, the conversation will be saved and restored from localStorage
     */
    readonly persistenceKey?: string;

    /**
     * Called when the chat state changes (messages, participants, etc.)
     */
    onChange?(messages: ReadonlyArray<ChatMessage>, participants: ReadonlyArray<ChatParticipant>): void;
    // <- TODO: [🖱] `LlmChatProps.onChange` and `ChatProps.onChange` are not the same, unite them or distinct by name
};
