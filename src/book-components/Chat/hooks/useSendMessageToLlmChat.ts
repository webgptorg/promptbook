'use client';

import { createContext, useContext } from 'react';

/**
 * Function type for sending a message to LlmChat
 */
export type SendMessageToLlmChatFunction = (message: string) => void;

/**
 * Context for LlmChat message sending functionality
 *
 * @private Internal utility of `useSendMessageToLlmChat` and `LlmChat`
 */
export const LlmChatContext = createContext<SendMessageToLlmChatFunction | null>(null);

/**
 * Hook to send a message to any LlmChat component from anywhere in the React tree
 *
 * This allows components to programmatically send messages to the chat as if the user
 * typed them in the input and pressed Enter. The message will be added to the chat
 * thread and trigger sending it to the LLM.
 *
 * @returns Function to send a message to the LlmChat
 * @throws Error if used outside of LlmChatProvider context
 *
 * @example
 * ```typescript
 * function MyButton() {
 *   const sendMessage = useSendMessageToLlmChat();
 *
 *   return (
 *     <button onClick={() => sendMessage('Hello, AI!')}>
 *       Send Hello
 *     </button>
 *   );
 * }
 * ```
 *
 * @public exported from `@promptbook/components`
 */
export function useSendMessageToLlmChat(): SendMessageToLlmChatFunction {
    const sendMessage = useContext(LlmChatContext);

    if (!sendMessage) {
        throw new Error(
            'useSendMessageToLlmChat must be used within a component that contains an LlmChat component. ' +
                'Make sure you have an <LlmChat/> component rendered somewhere in your component tree.',
        );
    }

    return sendMessage;
}
