'use client';

import { useRef } from 'react';

/**
 * Function type for sending a message to LlmChat.
 *
 * Implementation detail: The returned function is "attachable".
 * LlmChat will call the internal `_attach` method (if present) to bind
 * its real message handler. Messages sent before attachment are queued
 * and flushed after attachment.
 *
 * @public exported from `@promptbook/components`
 */
export type SendMessageToLlmChatFunction = {
    /**
     * Send a message to the bound LlmChat instance (or queue it until attached).
     */
    (message: string): void;

    /**
     * Internal method used by the <LlmChat/> component to attach its handler.
     * Not intended for consumer usage.
     *
     * @internal
     */
    _attach?: (handler: (message: string) => Promise<void> | void) => void;
};

/**
 * Hook to create a sendMessage function for an <LlmChat/> component WITHOUT needing any React Context.
 *
 * Usage pattern:
 * ```tsx
 * const sendMessage = useSendMessageToLlmChat();
 * return (
 *   <>
 *     <button onClick={() => sendMessage('Hello!')}>Hello</button>
 *     <LlmChat llmTools={llmTools} sendMessage={sendMessage} />
 *   </>
 * );
 * ```
 *
 * - No provider wrapping needed.
 * - Safe to call before the <LlmChat/> mounts (messages will be queued).
 * - Keeps DRY by letting <LlmChat/> reuse its internal `handleMessage` logic.
 *
 * @public
 */
export function useSendMessageToLlmChat(): SendMessageToLlmChatFunction {
    const ref = useRef<SendMessageToLlmChatFunction | null>(null);

    if (!ref.current) {
        let handler: ((message: string) => Promise<void> | void) | null = null;
        const queue: string[] = [];

        const sendMessage: SendMessageToLlmChatFunction = (message: string) => {
            if (handler) {
                // Fire and forget
                void handler(message);
            } else {
                queue.push(message);
            }
        };

        sendMessage._attach = (attachedHandler) => {
            handler = attachedHandler;
            // Flush queued messages
            while (queue.length > 0) {
                const next = queue.shift()!;
                void handler(next);
            }
        };

        ref.current = sendMessage;
    }

    return ref.current;
}
