import { useCallback, useEffect, useRef, useState } from 'react';
import type { Promisable } from 'type-fest';
import type { id } from '../../../types/typeAliases';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatFeedbackMode, ChatFeedbackResponse, ChatProps } from '../Chat/ChatProps';

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
    }) => Promisable<ChatFeedbackResponse | void>;
    /**
     * Feedback mode currently used by the chat UI.
     */
    feedbackMode: ChatFeedbackMode;
    /**
     * Optional localized labels and status messages used by the feedback UI.
     */
    feedbackTranslations?: ChatProps['feedbackTranslations'];
    /**
     * Whether the UI should apply mobile-specific behavior.
     */
    isMobile: boolean;
};

/**
 * Indicates how the feedback status message should be rendered.
 *
 * @private component of `<Chat/>`
 */
export type FeedbackStatusVariant = 'success' | 'error';

/**
 * Data used to show the transient feedback status toast.
 *
 * @private component of `<Chat/>`
 */
export type FeedbackStatus = {
    /**
     * Message displayed to the user.
     */
    readonly message: string;
    /**
     * Whether the message indicates success or failure.
     */
    readonly variant: FeedbackStatusVariant;
};

/**
 * Constant for default feedback success message.
 */
const DEFAULT_FEEDBACK_SUCCESS_MESSAGE = 'Thank you for your feedback!';
/**
 * Constant for default report issue success message.
 */
const DEFAULT_REPORT_ISSUE_SUCCESS_MESSAGE = 'Issue report submitted. Thank you!';
/**
 * Constant for default feedback error message.
 */
const DEFAULT_FEEDBACK_ERROR_MESSAGE = 'Failed to save feedback. Please try again.';

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
    feedbackStatus: FeedbackStatus | null;
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
    const { messages, onFeedback, feedbackMode, feedbackTranslations, isMobile } = options;
    const [ratingModalOpen, setRatingModalOpen] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
    const [messageRatings, setMessageRatings] = useState<Map<id, number>>(new Map());
    const [textRating, setTextRating] = useState('');
    const [hoveredRating, setHoveredRating] = useState(0);
    const [expandedMessageId, setExpandedMessageId] = useState<id | null>(null);
    const [feedbackStatus, setFeedbackStatus] = useState<FeedbackStatus | null>(null);
    const feedbackStatusTimeoutRef = useRef<number | null>(null);

    const handleRating = useCallback(
        (message: ChatMessage, newRating: number) => {
            const normalizedRating = feedbackMode === 'report_issue' ? 1 : newRating;
            setSelectedMessage(message);
            setMessageRatings((previousRatings) => {
                const nextRatings = new Map(previousRatings);
                nextRatings.set(
                    message.id ||
                        message.content /* <- TODO: [??][??] Is `message.content` good replacement for the ID */,
                    normalizedRating,
                );
                return nextRatings;
            });
            setRatingModalOpen(true);
        },
        [feedbackMode],
    );

    const showFeedbackStatus = useCallback((status: FeedbackStatus | null) => {
        if (feedbackStatusTimeoutRef.current !== null) {
            clearTimeout(feedbackStatusTimeoutRef.current);
            feedbackStatusTimeoutRef.current = null;
        }

        setFeedbackStatus(status);

        if (!status || typeof window === 'undefined') {
            return;
        }

        feedbackStatusTimeoutRef.current = window.setTimeout(() => {
            setFeedbackStatus(null);
            feedbackStatusTimeoutRef.current = null;
        }, 3000);
    }, []);

    useEffect(() => {
        return () => {
            if (feedbackStatusTimeoutRef.current !== null) {
                clearTimeout(feedbackStatusTimeoutRef.current);
                feedbackStatusTimeoutRef.current = null;
            }
        };
    }, []);

    const submitRating = useCallback(async () => {
        if (!selectedMessage) {
            return;
        }

        const selectedMessageId = selectedMessage.id || selectedMessage.content;
        const storedRating = messageRatings.get(selectedMessageId);
        const currentRating = feedbackMode === 'report_issue' ? storedRating || 1 : storedRating;
        if (!currentRating || feedbackMode === 'off') {
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
                const feedbackResponse = await onFeedback(feedbackData);
                showFeedbackStatus({
                    message:
                        feedbackResponse?.message ??
                        (feedbackMode === 'report_issue'
                            ? feedbackTranslations?.reportIssueSuccessMessage ?? DEFAULT_REPORT_ISSUE_SUCCESS_MESSAGE
                            : feedbackTranslations?.feedbackSuccessMessage ?? DEFAULT_FEEDBACK_SUCCESS_MESSAGE),
                    variant: 'success',
                });
            } catch (error) {
                console.error('Error submitting feedback:', error);
                const message =
                    error instanceof Error
                        ? error.message
                        : feedbackTranslations?.feedbackErrorMessage ?? DEFAULT_FEEDBACK_ERROR_MESSAGE;
                showFeedbackStatus({ message, variant: 'error' });
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
            showFeedbackStatus({
                message:
                    feedbackMode === 'report_issue'
                        ? feedbackTranslations?.reportIssueSuccessMessage ?? DEFAULT_REPORT_ISSUE_SUCCESS_MESSAGE
                        : feedbackTranslations?.feedbackSuccessMessage ?? DEFAULT_FEEDBACK_SUCCESS_MESSAGE,
                variant: 'success',
            });
        }

        setRatingModalOpen(false);
        setTextRating('');
        setSelectedMessage(null);
    }, [
        feedbackMode,
        feedbackTranslations?.feedbackErrorMessage,
        feedbackTranslations?.feedbackSuccessMessage,
        feedbackTranslations?.reportIssueSuccessMessage,
        messages,
        messageRatings,
        onFeedback,
        selectedMessage,
        showFeedbackStatus,
        textRating,
    ]);

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
            feedbackStatus,
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
