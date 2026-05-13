'use client';

import type { MouseEventHandler } from 'react';
import type { id } from '../../../types/string_token';
import { classNames } from '../../_common/react-utils/classNames';
import type { ChatMessage } from '../types/ChatMessage';
import styles from './Chat.module.css';
import type { ChatFeedbackMode, ChatProps } from './ChatProps';

/**
 * Supported star values rendered by the rating UI.
 *
 * @private component of `<ChatRatingModal/>`
 */
const STAR_RATINGS = [1, 2, 3, 4, 5] as const;

/**
 * Localized copy rendered by the rating modal.
 *
 * @private component of `<ChatRatingModal/>`
 */
type ChatRatingModalCopy = {
    readonly title: string;
    readonly userQuestionLabel: string;
    readonly expectedAnswerLabel: string;
    readonly expectedAnswerPlaceholder: string;
    readonly noteLabel: string;
    readonly notePlaceholder: string;
    readonly cancelLabel: string;
    readonly submitLabel: string;
};

/**
 * Props for the rating modal used in Chat.
 *
 * @private component of `<Chat/>`
 */
export type ChatRatingModalProps = {
    isOpen: boolean;
    selectedMessage: ChatMessage | null;
    postprocessedMessages: ReadonlyArray<ChatMessage>;
    messages: ReadonlyArray<ChatMessage>;
    hoveredRating: number;
    messageRatings: Map<id, number>;
    textRating: string;
    /**
     * Chooses which feedback flow the modal should render.
     */
    feedbackMode: ChatFeedbackMode;
    /**
     * Optional localized labels used by feedback controls.
     */
    feedbackTranslations?: ChatProps['feedbackTranslations'];
    mode: 'LIGHT' | 'DARK';
    isMobile: boolean;
    onClose: () => void;
    setHoveredRating: (value: number) => void;
    setMessageRatings: (value: Map<id, number> | ((previous: Map<id, number>) => Map<id, number>)) => void;
    setSelectedMessage: (value: ChatMessage | null) => void;
    setTextRating: (value: string) => void;
    submitRating: () => Promise<void>;
};

/**
 * Resolves the key used to persist message rating state.
 *
 * @private function of `<ChatRatingModal/>`
 */
function resolveChatRatingMessageKey(message: Pick<ChatMessage, 'id' | 'content'>) {
    return message.id || message.content /* <-[??] */;
}

/**
 * Returns whether the modal should render the report-issue flow.
 *
 * @private function of `<ChatRatingModal/>`
 */
function isReportIssueFeedbackMode(feedbackMode: ChatFeedbackMode): boolean {
    return feedbackMode === 'report_issue';
}

/**
 * Finds the previous user question from postprocessed messages when it directly precedes the selected response.
 *
 * @private function of `<ChatRatingModal/>`
 */
function resolveUserQuestionFromPostprocessedMessages(
    postprocessedMessages: ReadonlyArray<ChatMessage>,
    selectedMessage: ChatMessage,
): string | null {
    const selectedMessageIndex = postprocessedMessages.findIndex((message) => message.id === selectedMessage.id);

    if (selectedMessageIndex <= 0) {
        return null;
    }

    const previousMessage = postprocessedMessages[selectedMessageIndex - 1];

    if (previousMessage?.sender !== 'USER') {
        return null;
    }

    return previousMessage.content;
}

/**
 * Finds the nearest earlier user question in the original message list.
 *
 * @private function of `<ChatRatingModal/>`
 */
function resolveUserQuestionFromMessages(
    messages: ReadonlyArray<ChatMessage>,
    selectedMessage: ChatMessage,
): string | null {
    const selectedMessageIndex = messages.findIndex((message) => message.id === selectedMessage.id);

    for (let index = selectedMessageIndex - 1; index >= 0; index--) {
        const currentMessage = messages[index];

        if (currentMessage?.sender === 'USER') {
            return currentMessage.content;
        }
    }

    return null;
}

/**
 * Resolves the user question shown above the feedback fields.
 *
 * @private function of `<ChatRatingModal/>`
 */
function resolveChatRatingUserQuestion(params: {
    readonly postprocessedMessages: ReadonlyArray<ChatMessage>;
    readonly messages: ReadonlyArray<ChatMessage>;
    readonly selectedMessage: ChatMessage;
}): string {
    const { postprocessedMessages, messages, selectedMessage } = params;

    return (
        resolveUserQuestionFromPostprocessedMessages(postprocessedMessages, selectedMessage) ||
        resolveUserQuestionFromMessages(messages, selectedMessage) ||
        ''
    );
}

/**
 * Builds the localized text rendered by the modal.
 *
 * @private function of `<ChatRatingModal/>`
 */
function createChatRatingModalCopy(params: {
    readonly feedbackMode: ChatFeedbackMode;
    readonly feedbackTranslations?: ChatProps['feedbackTranslations'];
}): ChatRatingModalCopy {
    const { feedbackMode, feedbackTranslations } = params;
    const isReportIssueMode = isReportIssueFeedbackMode(feedbackMode);

    return {
        title: isReportIssueMode
            ? feedbackTranslations?.reportIssueModalTitle ?? 'Report issue'
            : feedbackTranslations?.rateResponseModalTitle ?? 'Rate this response',
        userQuestionLabel: feedbackTranslations?.userQuestionLabel ?? 'Your question:',
        expectedAnswerLabel: isReportIssueMode
            ? feedbackTranslations?.reportIssueExpectedAnswerLabel ?? 'What should the answer include?'
            : feedbackTranslations?.expectedAnswerLabel ?? 'Expected answer:',
        expectedAnswerPlaceholder: feedbackTranslations?.expectedAnswerPlaceholder ?? 'Expected answer (optional)',
        noteLabel: isReportIssueMode
            ? feedbackTranslations?.reportIssueDetailsLabel ?? 'Issue details:'
            : feedbackTranslations?.noteLabel ?? 'Note:',
        notePlaceholder: isReportIssueMode
            ? feedbackTranslations?.reportIssueDetailsPlaceholder ?? 'Describe what went wrong (optional)'
            : feedbackTranslations?.notePlaceholder ?? 'Add a note (optional)',
        cancelLabel: feedbackTranslations?.cancelLabel || 'Cancel',
        submitLabel: isReportIssueMode
            ? feedbackTranslations?.reportIssueSubmitLabel ?? 'Report issue'
            : feedbackTranslations?.submitLabel ?? 'Submit',
    };
}

/**
 * Resolves the active rating, preferring hover preview over persisted value.
 *
 * @private function of `<ChatRatingModal/>`
 */
function resolveSelectedChatRating(params: {
    readonly hoveredRating: number;
    readonly messageRatings: Map<id, number>;
    readonly selectedMessage: ChatMessage;
}): number {
    const { hoveredRating, messageRatings, selectedMessage } = params;

    return hoveredRating || messageRatings.get(resolveChatRatingMessageKey(selectedMessage)) || 0;
}

/**
 * Resolves the color for one star in the rating picker.
 *
 * @private function of `<ChatRatingModal/>`
 */
function resolveChatRatingStarColor(star: number, selectedRating: number, mode: 'LIGHT' | 'DARK'): string {
    if (star <= selectedRating) {
        return '#FFD700';
    }

    return mode === 'LIGHT' ? '#ccc' : '#555';
}

/**
 * Returns the placeholder used in the expected-answer field.
 *
 * @private function of `<ChatRatingModal/>`
 */
function resolveExpectedAnswerPlaceholder(selectedMessage: ChatMessage, modalCopy: ChatRatingModalCopy): string {
    return selectedMessage.content || modalCopy.expectedAnswerPlaceholder;
}

/**
 * Closes the modal when the mobile backdrop itself is clicked.
 *
 * @private function of `<ChatRatingModal/>`
 */
function createChatRatingBackdropClickHandler(params: {
    readonly isMobile: boolean;
    readonly onClose: () => void;
}): MouseEventHandler<HTMLDivElement> {
    const { isMobile, onClose } = params;

    return (event) => {
        if (event.target === event.currentTarget && isMobile) {
            onClose();
        }
    };
}

/**
 * Renders the optional star selector for the rating flow.
 *
 * @private component of `<ChatRatingModal/>`
 */
function ChatRatingModalStarsSection(props: {
    readonly feedbackMode: ChatFeedbackMode;
    readonly hoveredRating: number;
    readonly messageRatings: Map<id, number>;
    readonly mode: 'LIGHT' | 'DARK';
    readonly selectedMessage: ChatMessage;
    readonly setHoveredRating: (value: number) => void;
    readonly setMessageRatings: (value: Map<id, number> | ((previous: Map<id, number>) => Map<id, number>)) => void;
}) {
    const { feedbackMode, hoveredRating, messageRatings, mode, selectedMessage, setHoveredRating, setMessageRatings } =
        props;

    if (isReportIssueFeedbackMode(feedbackMode)) {
        return null;
    }

    const selectedRating = resolveSelectedChatRating({
        hoveredRating,
        messageRatings,
        selectedMessage,
    });

    return (
        <div className={styles.stars}>
            {STAR_RATINGS.map((star) => (
                <span
                    key={star}
                    onClick={() =>
                        setMessageRatings((previousRatings) => {
                            const nextRatings = new Map(previousRatings);
                            nextRatings.set(resolveChatRatingMessageKey(selectedMessage), star);
                            return nextRatings;
                        })
                    }
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className={classNames(styles.ratingModalStar)}
                    style={{
                        color: resolveChatRatingStarColor(star, selectedRating, mode),
                    }}
                >
                    ⭐
                </span>
            ))}
        </div>
    );
}

/**
 * Renders the footer action buttons for the rating modal.
 *
 * @private component of `<ChatRatingModal/>`
 */
function ChatRatingModalActions(props: {
    readonly cancelLabel: string;
    readonly onClose: () => void;
    readonly submitLabel: string;
    readonly submitRating: () => Promise<void>;
}) {
    const { cancelLabel, onClose, submitLabel, submitRating } = props;

    return (
        <div className={styles.ratingActions}>
            <button onClick={onClose}>{cancelLabel}</button>
            <button onClick={submitRating}>{submitLabel}</button>
        </div>
    );
}

/**
 * Modal that captures per-message rating feedback.
 *
 * @private component of `<Chat/>`
 */
export function ChatRatingModal(props: ChatRatingModalProps) {
    const {
        isOpen,
        selectedMessage,
        postprocessedMessages,
        messages,
        hoveredRating,
        messageRatings,
        textRating,
        feedbackMode,
        feedbackTranslations,
        mode,
        isMobile,
        onClose,
        setHoveredRating,
        setMessageRatings,
        setSelectedMessage,
        setTextRating,
        submitRating,
    } = props;

    if (!isOpen || !selectedMessage) {
        return null;
    }
    const modalCopy = createChatRatingModalCopy({
        feedbackMode,
        feedbackTranslations,
    });
    const userQuestion = resolveChatRatingUserQuestion({
        postprocessedMessages,
        messages,
        selectedMessage,
    });
    const handleBackdropClick = createChatRatingBackdropClickHandler({
        isMobile,
        onClose,
    });

    return (
        <div
            className={styles.ratingModal}
            data-chat-modal="rating"
            data-chat-theme={mode.toLowerCase()}
            onClick={handleBackdropClick}
        >
            <div className={styles.ratingModalContent}>
                <h3>{modalCopy.title}</h3>
                <ChatRatingModalStarsSection
                    feedbackMode={feedbackMode}
                    hoveredRating={hoveredRating}
                    messageRatings={messageRatings}
                    mode={mode}
                    selectedMessage={selectedMessage}
                    setHoveredRating={setHoveredRating}
                    setMessageRatings={setMessageRatings}
                />
                {modalCopy.userQuestionLabel}
                <textarea readOnly value={userQuestion} className={styles.ratingInput} />
                {modalCopy.expectedAnswerLabel}
                <textarea
                    placeholder={resolveExpectedAnswerPlaceholder(selectedMessage, modalCopy)}
                    defaultValue={selectedMessage.expectedAnswer || selectedMessage.content}
                    onChange={(event) => {
                        if (selectedMessage) {
                            setSelectedMessage({ ...selectedMessage, expectedAnswer: event.target.value });
                        }
                    }}
                    className={styles.ratingInput}
                />
                {modalCopy.noteLabel}
                <textarea
                    placeholder={modalCopy.notePlaceholder}
                    defaultValue={textRating}
                    onChange={(event) => setTextRating(event.target.value)}
                    className={styles.ratingInput}
                />
                <ChatRatingModalActions
                    cancelLabel={modalCopy.cancelLabel}
                    onClose={onClose}
                    submitLabel={modalCopy.submitLabel}
                    submitRating={submitRating}
                />
            </div>
        </div>
    );
}
