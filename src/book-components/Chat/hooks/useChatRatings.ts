import { useCallback, useEffect, useState } from 'react';
import type { Promisable } from 'type-fest';
import type { id } from '../../../types/typeAliases';
import type { ChatMessage } from '../types/ChatMessage';

/**
 * Input parameters for the chat rating hook.
 *
 * @private component of `<Chat/>`
 */
export type UseChatRatingsOptions = {
    /**
     * Messages in the chat thread.
     */
    messages: ReadonlyArray<ChatMessage>;
    /**
     * Optional feedback handler passed to Chat.
     */
    onFeedback?: (feedback: {
        message: ChatMessage;
        rating: number;
        textRating: string;
        chatThread: string;
        expectedAnswer: string | null;
        url: string;
    }) => Promisable<void>;
    /**
     * Whether the UI should apply mobile-specific behavior.
     */
    isMobile: boolean;
};

/**
 * Rating state tracked for the chat UI.
 *
 * @private component of `<Chat/>`
 */
export type ChatRatingsState = {
    ratingModalOpen: boolean;
    selectedMessage: ChatMessage | null;
    messageRatings: Map<id, number>;
    textRating: string;
    hoveredRating: number;
    expandedMessageId: id | null;
    ratingConfirmation: string | null;
};

/**
 * Rating actions for the chat UI.
 *
 * @private component of `<Chat/>`
 */
export type ChatRatingsActions = {
    setRatingModalOpen: (value: boolean) => void;
    setSelectedMessage: (value: ChatMessage | null) => void;
    setMessageRatings: (value: Map<id, number> | ((previous: Map<id, number>) => Map<id, number>)) => void;
    setTextRating: (value: string) => void;
    setHoveredRating: (value: number) => void;
    setExpandedMessageId: (value: id | null) => void;
    handleRating: (message: ChatMessage, newRating: number) => void;
    submitRating: () => Promise<void>;
};

/**
 * Hook that centralizes rating state and handlers for Chat.
 *
 * @private component of `<Chat/>`
 */
export function useChatRatings(options: UseChatRatingsOptions): {
    state: ChatRatingsState;
    actions: ChatRatingsActions;
} {
    const { messages, onFeedback, isMobile } = options;
    const [ratingModalOpen, setRatingModalOpen] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
    const [messageRatings, setMessageRatings] = useState<Map<id, number>>(new Map());
    const [textRating, setTextRating] = useState('');
    const [hoveredRating, setHoveredRating] = useState(0);
    const [expandedMessageId, setExpandedMessageId] = useState<id | null>(null);
    const [ratingConfirmation, setRatingConfirmation] = useState<string | null>(null);

    const handleRating = useCallback((message: ChatMessage, newRating: number) => {
        setSelectedMessage(message);
        setMessageRatings((previousRatings) => {
            const nextRatings = new Map(previousRatings);
            nextRatings.set(
                message.id || message.content /* <- TODO: [??][??] Is `message.content` good replacement for the ID */,
                newRating,
            );
            return nextRatings;
        });
        setRatingModalOpen(true);
    }, []);

    const submitRating = useCallback(async () => {
        if (!selectedMessage) {
            return;
        }

        const currentRating = messageRatings.get(selectedMessage.id || selectedMessage.content /* <-[??] */);
        if (!currentRating) {
            return;
        }

        const chatThread = messages.map((msg) => `${msg.content}`).join('\n\n---\n\n');

        const feedbackData = {
            message: selectedMessage,
            rating: currentRating,
            textRating: textRating,
            chatThread,
            expectedAnswer: selectedMessage.expectedAnswer || selectedMessage.content || null,
            url: window.location.href,
        };

        if (onFeedback) {
            try {
                await onFeedback(feedbackData);
            } catch (error) {
                console.error('Error submitting feedback:', error);
                alert('Failed to submit feedback. Please try again.');
                return;
            }
        } else {
            console.info('Rating submitted:', {
                rating: '?'.repeat(currentRating),
                textRating: textRating,
                chatThread,
                expectedAnswer: selectedMessage.expectedAnswer || selectedMessage.content || null,
                url: window.location.href,
            });
        }

        setRatingModalOpen(false);
        setTextRating('');
        setSelectedMessage(null);
        setRatingConfirmation('Thank you for your feedback!');
        setTimeout(() => setRatingConfirmation(null), 3000);
    }, [selectedMessage, messageRatings, textRating, messages, onFeedback]);

    useEffect(() => {
        if (ratingModalOpen && isMobile) {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = 'unset';
            };
        }
    }, [ratingModalOpen, isMobile]);

    return {
        state: {
            ratingModalOpen,
            selectedMessage,
            messageRatings,
            textRating,
            hoveredRating,
            expandedMessageId,
            ratingConfirmation,
        },
        actions: {
            setRatingModalOpen,
            setSelectedMessage,
            setMessageRatings,
            setTextRating,
            setHoveredRating,
            setExpandedMessageId,
            handleRating,
            submitRating,
        },
    };
}
