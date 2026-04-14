'use client';

import { useRouter } from 'next/navigation';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type Dispatch,
    type FormEvent,
    type MutableRefObject,
    type SetStateAction,
} from 'react';

/**
 * Props accepted by the textarea submission controller.
 *
 * @private function of AgentTextareaClient
 */
type UseAgentTextareaSubmissionProps = {
    /**
     * Canonical agent identifier used to resolve chat route targets.
     */
    readonly agentName: string;
};

/**
 * Message state and submission handlers used by `AgentTextareaClient`.
 *
 * @private function of AgentTextareaClient
 */
type UseAgentTextareaSubmissionResult = {
    readonly handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
    readonly isSubmitDisabled: boolean;
    readonly isSubmitting: boolean;
    readonly messageContent: string;
    readonly messageContentRef: MutableRefObject<string>;
    readonly setMessageContent: Dispatch<SetStateAction<string>>;
    readonly submitMessage: (messageContentOverride?: string) => void;
};

/**
 * Trims user-entered content and returns non-empty message values.
 *
 * @param messageContent - Raw textarea value.
 * @returns Normalized message or `null` when empty.
 */
function resolveMessageToSend(messageContent: string): string | null {
    const normalizedMessage = messageContent.trim();
    return normalizedMessage === '' ? null : normalizedMessage;
}

/**
 * Builds chat route that triggers standard auto-execution pipeline.
 *
 * @param agentName - Canonical agent identifier.
 * @param messageContent - Message to auto-send in chat.
 * @returns Chat route with serialized query parameters.
 */
function buildChatMessageRoute(agentName: string, messageContent: string): string {
    const searchParams = new URLSearchParams();
    searchParams.set('message', messageContent);
    searchParams.set('newChat', '1');
    return `/agents/${encodeURIComponent(agentName)}/chat?${searchParams.toString()}`;
}

/**
 * Controls textarea message state and chat navigation for `AgentTextareaClient`.
 *
 * @private function of AgentTextareaClient
 */
export function useAgentTextareaSubmission({
    agentName,
}: UseAgentTextareaSubmissionProps): UseAgentTextareaSubmissionResult {
    const router = useRouter();
    const [messageContent, setMessageContent] = useState('');
    const messageContentRef = useRef(messageContent);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const normalizedMessage = useMemo(() => resolveMessageToSend(messageContent), [messageContent]);
    const isSubmitDisabled = isSubmitting || normalizedMessage === null;

    useEffect(() => {
        messageContentRef.current = messageContent;
    }, [messageContent]);

    /**
     * Submits current message and redirects to the canonical chat page.
     */
    const submitMessage = useCallback(
        (messageContentOverride?: string) => {
            if (isSubmitting) {
                return;
            }

            const normalizedMessageToSend = resolveMessageToSend(messageContentOverride ?? messageContentRef.current);
            if (normalizedMessageToSend === null) {
                return;
            }

            setIsSubmitting(true);
            setMessageContent('');
            router.push(buildChatMessageRoute(agentName, normalizedMessageToSend));
        },
        [agentName, isSubmitting, router],
    );

    /**
     * Handles native form submit action.
     *
     * @param event - Form submit event.
     */
    const handleSubmit = useCallback(
        (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            submitMessage();
        },
        [submitMessage],
    );

    return {
        handleSubmit,
        isSubmitDisabled,
        isSubmitting,
        messageContent,
        messageContentRef,
        setMessageContent,
        submitMessage,
    };
}
