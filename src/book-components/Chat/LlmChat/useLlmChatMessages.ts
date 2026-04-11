'use client';

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type Dispatch,
    type MutableRefObject,
    type SetStateAction,
} from 'react';
import type { ChatMessage } from '../types/ChatMessage';
import { ChatPersistence } from '../utils/ChatPersistence';

/**
 * Inputs required to manage the persisted `<LlmChat/>` message list.
 *
 * @private function of `useLlmChatMessages`
 */
type UseLlmChatMessagesProps = {
    readonly initialMessages?: ReadonlyArray<ChatMessage>;
    readonly persistenceKey?: string;
};

/**
 * State and helpers returned by `useLlmChatMessages`.
 *
 * @private function of `useLlmChatMessages`
 */
type UseLlmChatMessagesResult = {
    readonly buildInitialMessages: () => Array<ChatMessage>;
    readonly hasUserInteractedRef: MutableRefObject<boolean>;
    readonly messages: Array<ChatMessage>;
    readonly setMessages: Dispatch<SetStateAction<Array<ChatMessage>>>;
};

/**
 * Creates a mutable copy of the configured initial messages.
 *
 * @private function of `useLlmChatMessages`
 */
function copyInitialLlmChatMessages(initialMessages?: ReadonlyArray<ChatMessage>): Array<ChatMessage> {
    return initialMessages ? [...initialMessages] : [];
}

/**
 * Manages initial seeding plus optional local persistence for `<LlmChat/>`.
 *
 * @private function of `useLlmChatState`
 */
export function useLlmChatMessages(props: UseLlmChatMessagesProps): UseLlmChatMessagesResult {
    const { initialMessages, persistenceKey } = props;
    const buildInitialMessages = useCallback(
        () => copyInitialLlmChatMessages(initialMessages),
        [initialMessages],
    );
    const [messages, setMessages] = useState<Array<ChatMessage>>(() => buildInitialMessages());
    const hasUserInteractedRef = useRef(false);

    useEffect(() => {
        if (!persistenceKey || !ChatPersistence.isAvailable()) {
            return;
        }

        const persistedMessages = ChatPersistence.loadMessages(persistenceKey);
        if (persistedMessages.length === 0) {
            return;
        }

        setMessages(persistedMessages);
        hasUserInteractedRef.current = true;
    }, [persistenceKey]);

    useEffect(() => {
        if (!persistenceKey || !ChatPersistence.isAvailable() || messages.length === 0 || !hasUserInteractedRef.current) {
            return;
        }

        ChatPersistence.saveMessages(persistenceKey, messages);
    }, [messages, persistenceKey]);

    return {
        buildInitialMessages,
        hasUserInteractedRef,
        messages,
        setMessages,
    };
}
