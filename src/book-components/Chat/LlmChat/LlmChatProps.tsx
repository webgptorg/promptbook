'use client';
// <- Note: [👲] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

import type { LlmExecutionTools } from '../../../execution/LlmExecutionTools';
import type { id } from '../../../types/typeAliases';
import type { ChatProps } from '../Chat/ChatProps';
import type { SendMessageToLlmChatFunction } from '../hooks/useSendMessageToLlmChat';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';

/**
 * Props for LlmChat component, derived from ChatProps but with LLM-specific modifications
 *
 * @public exported from `@promptbook/components`
 */

export type LlmChatProps = Omit<ChatProps, 'messages' | 'onMessage' | 'onChange'> & {
    /**
     * Optional thread (full chat history) to be passed to LLM execution tools.
     * If not provided, the internal messages state will be used.
     */
    readonly thread?: ReadonlyArray<ChatMessage>;
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
     * Optional initial messages to pre-populate the chat.
     * - They can include both USER and ASSISTANT messages.
     * - They are only used when there is no persisted conversation (persistence takes precedence).
     * - They are not automatically persisted until the user sends a new message.
     */
    readonly initialMessages?: ReadonlyArray<ChatMessage>;

    /**
     * Called when the chat state changes (messages, participants, etc.)
     */
    onChange?(messages: ReadonlyArray<ChatMessage>, participants: ReadonlyArray<ChatParticipant>): void;
    // <- TODO: [🖱] `LlmChatProps.onChange` and `ChatProps.onChange` are not the same, unite them or distinct by name

    /**
     * Optional external sendMessage function produced by useSendMessageToLlmChat hook.
     * When provided, LlmChat will attach its internal handler to it (no React context needed).
     */
    readonly sendMessage?: SendMessageToLlmChatFunction;

    /**
     * Name of the USER as participant in the chat
     *
     * @default 'USER'
     */
    readonly userParticipantName?: id;

    /**
     * Name of the LLM as participant in the chat
     *
     * @default 'ASSISTANT'
     */
    readonly llmParticipantName?: id;
};
