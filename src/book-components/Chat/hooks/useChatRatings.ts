import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { Promisable } from 'type-fest';
import type { id } from '../../../types/string_token';
import type { ChatFeedbackMode, ChatFeedbackResponse, ChatProps } from '../Chat/ChatProps';
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
 * Full feedback payload submitted from the chat rating flow.
 *
 * @private function of `useChatRatings`
 */
type ChatFeedbackSubmission = {
    readonly message: ChatMessage;
    readonly rating: number;
    readonly textRating: string;
    readonly chatThread: string;
    readonly expectedAnswer: string | null;
    readonly url: string;
};

/**
 * Prepared submission state once the hook has enough data to submit feedback.
 *
 * @private function of `useChatRatings`
 */
type PreparedChatFeedbackSubmission = {
    readonly currentRating: number;
    readonly feedbackData: ChatFeedbackSubmission;
};

/**
 * Dependencies needed to build the submit handler.
 *
 * @private function of `useChatRatings`
 */
type UseChatRatingSubmissionOptions = {
    readonly feedbackMode: ChatFeedbackMode;
    readonly feedbackTranslations?: ChatProps['feedbackTranslations'];
    readonly messageRatings: Map<id, number>;
    readonly messages: ReadonlyArray<ChatMessage>;
    readonly onFeedback?: UseChatRatingsOptions['onFeedback'];
    readonly selectedMessage: ChatMessage | null;
    readonly setRatingModalOpen: (value: boolean) => void;
    readonly setSelectedMessage: (value: ChatMessage | null) => void;
    readonly setTextRating: (value: string) => void;
    readonly showFeedbackStatus: (status: FeedbackStatus | null) => void;
    readonly textRating: string;
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
 * Constant for feedback status timeout.
 */
const FEEDBACK_STATUS_TIMEOUT_IN_MILLISECONDS = 3000;

/**
 * Resolves the key used to keep one message rating in the local map.
 *
 * @private function of `useChatRatings`
 */
function resolveChatRatingMessageKey(message: Pick<ChatMessage, 'id' | 'content'>) {
    return message.id || message.content /* <- TODO: [??][??] Is `message.content` good replacement for the ID */;
}

/**
 * Normalizes the stored rating for the current feedback mode.
 *
 * @private function of `useChatRatings`
 */
function normalizeChatRatingValue(feedbackMode: ChatFeedbackMode, rating: number): number {
    return feedbackMode === 'report_issue' ? 1 : rating;
}

/**
 * Creates the next message-rating map with one updated message entry.
 *
 * @private function of `useChatRatings`
 */
function createUpdatedMessageRatings(
    previousRatings: Map<id, number>,
    message: Pick<ChatMessage, 'id' | 'content'>,
    rating: number,
): Map<id, number> {
    const nextRatings = new Map(previousRatings);
    nextRatings.set(resolveChatRatingMessageKey(message), rating);
    return nextRatings;
}

/**
 * Clears the transient feedback-status timeout when it is active.
 *
 * @private function of `useChatRatings`
 */
function clearFeedbackStatusTimeout(feedbackStatusTimeoutRef: MutableRefObject<number | null>): void {
    if (feedbackStatusTimeoutRef.current === null) {
        return;
    }

    clearTimeout(feedbackStatusTimeoutRef.current);
    feedbackStatusTimeoutRef.current = null;
}

/**
 * Resolves the rating currently selected for the message being submitted.
 *
 * @private function of `useChatRatings`
 */
function resolveSelectedMessageRating(params: {
    readonly feedbackMode: ChatFeedbackMode;
    readonly selectedMessage: ChatMessage;
    readonly messageRatings: Map<id, number>;
}): number | null {
    const { feedbackMode, selectedMessage, messageRatings } = params;
    const storedRating = messageRatings.get(resolveChatRatingMessageKey(selectedMessage));

    if (feedbackMode === 'report_issue') {
        return storedRating || 1;
    }

    return storedRating || null;
}

/**
 * Serializes the current chat thread into the format expected by feedback handlers.
 *
 * @private function of `useChatRatings`
 */
function createChatFeedbackThread(messages: ReadonlyArray<ChatMessage>): string {
    return messages.map((message) => `${message.content}`).join('\n\n---\n\n');
}

/**
 * Builds the payload submitted to the external feedback callback.
 *
 * @private function of `useChatRatings`
 */
function createChatFeedbackSubmission(params: {
    readonly currentRating: number;
    readonly messages: ReadonlyArray<ChatMessage>;
    readonly selectedMessage: ChatMessage;
    readonly textRating: string;
}): ChatFeedbackSubmission {
    const { currentRating, messages, selectedMessage, textRating } = params;

    return {
        message: selectedMessage,
        rating: currentRating,
        textRating,
        chatThread: createChatFeedbackThread(messages),
        expectedAnswer: selectedMessage.expectedAnswer || selectedMessage.content || null,
        url: window.location.href,
    };
}

/**
 * Resolves whether the current hook state is ready to submit feedback.
 *
 * @private function of `useChatRatings`
 */
function prepareChatFeedbackSubmission(params: {
    readonly feedbackMode: ChatFeedbackMode;
    readonly messageRatings: Map<id, number>;
    readonly messages: ReadonlyArray<ChatMessage>;
    readonly selectedMessage: ChatMessage | null;
    readonly textRating: string;
}): PreparedChatFeedbackSubmission | null {
    const { feedbackMode, messageRatings, messages, selectedMessage, textRating } = params;

    if (!selectedMessage || feedbackMode === 'off') {
        return null;
    }

    const currentRating = resolveSelectedMessageRating({
        feedbackMode,
        selectedMessage,
        messageRatings,
    });

    if (!currentRating) {
        return null;
    }

    return {
        currentRating,
        feedbackData: createChatFeedbackSubmission({
            currentRating,
            messages,
            selectedMessage,
            textRating,
        }),
    };
}

/**
 * Resolves the success message shown after a rating or issue report is submitted.
 *
 * @private function of `useChatRatings`
 */
function resolveChatFeedbackSuccessMessage(params: {
    readonly feedbackMode: ChatFeedbackMode;
    readonly feedbackTranslations?: ChatProps['feedbackTranslations'];
    readonly feedbackResponse?: ChatFeedbackResponse | void;
}): string {
    const { feedbackMode, feedbackTranslations, feedbackResponse } = params;

    if (feedbackResponse?.message) {
        return feedbackResponse.message;
    }

    if (feedbackMode === 'report_issue') {
        return feedbackTranslations?.reportIssueSuccessMessage ?? DEFAULT_REPORT_ISSUE_SUCCESS_MESSAGE;
    }

    return feedbackTranslations?.feedbackSuccessMessage ?? DEFAULT_FEEDBACK_SUCCESS_MESSAGE;
}

/**
 * Resolves the error message shown when feedback submission fails.
 *
 * @private function of `useChatRatings`
 */
function resolveChatFeedbackErrorMessage(
    error: unknown,
    feedbackTranslations?: ChatProps['feedbackTranslations'],
): string {
    if (error instanceof Error) {
        return error.message;
    }

    return feedbackTranslations?.feedbackErrorMessage ?? DEFAULT_FEEDBACK_ERROR_MESSAGE;
}

/**
 * Logs the fallback feedback submission when no external handler is provided.
 *
 * @private function of `useChatRatings`
 */
function logChatFeedbackSubmission(feedbackData: ChatFeedbackSubmission): void {
    console.info('Rating submitted:', {
        rating: '?'.repeat(feedbackData.rating),
        textRating: feedbackData.textRating,
        chatThread: feedbackData.chatThread,
        expectedAnswer: feedbackData.expectedAnswer,
        url: feedbackData.url,
    });
}

/**
 * Submits feedback through the external callback when present, otherwise logs it locally.
 *
 * @private function of `useChatRatings`
 */
async function submitChatFeedback(params: {
    readonly feedbackData: ChatFeedbackSubmission;
    readonly feedbackMode: ChatFeedbackMode;
    readonly feedbackTranslations?: ChatProps['feedbackTranslations'];
    readonly onFeedback?: UseChatRatingsOptions['onFeedback'];
}): Promise<FeedbackStatus> {
    const { feedbackData, feedbackMode, feedbackTranslations, onFeedback } = params;

    const feedbackResponse = onFeedback ? await onFeedback(feedbackData) : undefined;

    if (!onFeedback) {
        logChatFeedbackSubmission(feedbackData);
    }

    return {
        message: resolveChatFeedbackSuccessMessage({
            feedbackMode,
            feedbackTranslations,
            feedbackResponse,
        }),
        variant: 'success',
    };
}

/**
 * Clears the rating modal state after a successful submission.
 *
 * @private function of `useChatRatings`
 */
function resetChatRatingSubmissionState(params: {
    readonly setRatingModalOpen: (value: boolean) => void;
    readonly setSelectedMessage: (value: ChatMessage | null) => void;
    readonly setTextRating: (value: string) => void;
}): void {
    const { setRatingModalOpen, setSelectedMessage, setTextRating } = params;
    setRatingModalOpen(false);
    setTextRating('');
    setSelectedMessage(null);
}

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
 * Owns the mutable chat-rating state and the message-rating selection handler.
 *
 * @private internal hook of `useChatRatings`
 */
function useChatRatingState(feedbackMode: ChatFeedbackMode) {
    const [ratingModalOpen, setRatingModalOpen] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
    const [messageRatings, setMessageRatings] = useState<Map<id, number>>(new Map());
    const [textRating, setTextRating] = useState('');
    const [hoveredRating, setHoveredRating] = useState(0);
    const [expandedMessageId, setExpandedMessageId] = useState<id | null>(null);

    const handleRating = useCallback(
        (message: ChatMessage, newRating: number) => {
            const normalizedRating = normalizeChatRatingValue(feedbackMode, newRating);
            setSelectedMessage(message);
            setMessageRatings((previousRatings) => {
                return createUpdatedMessageRatings(previousRatings, message, normalizedRating);
            });
            setRatingModalOpen(true);
        },
        [feedbackMode],
    );

    return {
        state: {
            ratingModalOpen,
            selectedMessage,
            messageRatings,
            textRating,
            hoveredRating,
            expandedMessageId,
        },
        actions: {
            setRatingModalOpen,
            setSelectedMessage,
            setMessageRatings,
            setTextRating,
            setHoveredRating,
            setExpandedMessageId,
            handleRating,
        },
    };
}

/**
 * Owns the transient feedback-status toast state and auto-hide lifecycle.
 *
 * @private internal hook of `useChatRatings`
 */
function useChatFeedbackStatus() {
    const [feedbackStatus, setFeedbackStatus] = useState<FeedbackStatus | null>(null);
    const feedbackStatusTimeoutRef = useRef<number | null>(null);

    const showFeedbackStatus = useCallback((status: FeedbackStatus | null) => {
        clearFeedbackStatusTimeout(feedbackStatusTimeoutRef);
        setFeedbackStatus(status);

        if (!status || typeof window === 'undefined') {
            return;
        }

        feedbackStatusTimeoutRef.current = window.setTimeout(() => {
            setFeedbackStatus(null);
            feedbackStatusTimeoutRef.current = null;
        }, FEEDBACK_STATUS_TIMEOUT_IN_MILLISECONDS);
    }, []);

    useEffect(() => {
        return () => {
            clearFeedbackStatusTimeout(feedbackStatusTimeoutRef);
        };
    }, []);

    return {
        feedbackStatus,
        showFeedbackStatus,
    };
}

/**
 * Builds the submit handler that validates, submits, reports status, and resets the modal.
 *
 * @private internal hook of `useChatRatings`
 */
function useChatRatingSubmission(options: UseChatRatingSubmissionOptions): () => Promise<void> {
    const {
        feedbackMode,
        feedbackTranslations,
        messageRatings,
        messages,
        onFeedback,
        selectedMessage,
        setRatingModalOpen,
        setSelectedMessage,
        setTextRating,
        showFeedbackStatus,
        textRating,
    } = options;

    return useCallback(async () => {
        const preparedSubmission = prepareChatFeedbackSubmission({
            feedbackMode,
            messageRatings,
            messages,
            selectedMessage,
            textRating,
        });

        if (!preparedSubmission) {
            return;
        }

        try {
            const feedbackStatus = await submitChatFeedback({
                feedbackData: preparedSubmission.feedbackData,
                feedbackMode,
                feedbackTranslations,
                onFeedback,
            });
            showFeedbackStatus(feedbackStatus);
        } catch (error) {
            console.error('Error submitting feedback:', error);
            showFeedbackStatus({
                message: resolveChatFeedbackErrorMessage(error, feedbackTranslations),
                variant: 'error',
            });
            return;
        }

        resetChatRatingSubmissionState({
            setRatingModalOpen,
            setSelectedMessage,
            setTextRating,
        });
    }, [
        feedbackMode,
        feedbackTranslations,
        messageRatings,
        messages,
        onFeedback,
        selectedMessage,
        setRatingModalOpen,
        setSelectedMessage,
        setTextRating,
        showFeedbackStatus,
        textRating,
    ]);
}

/**
 * Locks page scrolling while the rating modal is open on mobile layouts.
 *
 * @private internal hook of `useChatRatings`
 */
function useChatRatingModalBodyScrollLock(params: {
    readonly isMobile: boolean;
    readonly ratingModalOpen: boolean;
}): void {
    const { isMobile, ratingModalOpen } = params;

    useEffect(() => {
        if (!(ratingModalOpen && isMobile)) {
            return;
        }

        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isMobile, ratingModalOpen]);
}

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
    const { state, actions } = useChatRatingState(feedbackMode);
    const { feedbackStatus, showFeedbackStatus } = useChatFeedbackStatus();
    const submitRating = useChatRatingSubmission({
        feedbackMode,
        feedbackTranslations,
        messageRatings: state.messageRatings,
        messages,
        onFeedback,
        selectedMessage: state.selectedMessage,
        setRatingModalOpen: actions.setRatingModalOpen,
        setSelectedMessage: actions.setSelectedMessage,
        setTextRating: actions.setTextRating,
        showFeedbackStatus,
        textRating: state.textRating,
    });

    useChatRatingModalBodyScrollLock({
        isMobile,
        ratingModalOpen: state.ratingModalOpen,
    });

    return {
        state: {
            ...state,
            feedbackStatus,
        },
        actions: {
            ...actions,
            submitRating,
        },
    };
}
