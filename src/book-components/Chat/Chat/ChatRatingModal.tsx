'use client';

import type { id } from '../../../types/typeAliases';
import { classNames } from '../../_common/react-utils/classNames';
import type { ChatMessage } from '../types/ChatMessage';
import styles from './Chat.module.css';

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

    const userQuestion = (() => {
        const idx = postprocessedMessages.findIndex((message) => message.id === selectedMessage.id);
        if (idx > 0) {
            const prev = postprocessedMessages[idx - 1];

            if (prev?.sender === 'USER') {
                return prev.content;
            }
        }

        for (let i = messages.findIndex((message) => message.id === selectedMessage.id) - 1; i >= 0; i--) {
            if (messages[i]?.sender === 'USER') {
                return messages[i]?.content || '';
            }
        }

        return '';
    })();

    return (
        <div
            className={styles.ratingModal}
            onClick={(event) => {
                if (event.target === event.currentTarget && isMobile) {
                    onClose();
                }
            }}
        >
            <div className={styles.ratingModalContent}>
                <h3>Rate this response</h3>
                <div className={styles.stars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <span
                            key={star}
                            onClick={() =>
                                setMessageRatings((previousRatings) => {
                                    const nextRatings = new Map(previousRatings);
                                    nextRatings.set(selectedMessage.id || selectedMessage.content /* <-[??] */, star);
                                    return nextRatings;
                                })
                            }
                            onMouseEnter={() => setHoveredRating(star)}
                            onMouseLeave={() => setHoveredRating(0)}
                            className={classNames(styles.ratingModalStar)}
                            style={{
                                color:
                                    star <=
                                    (hoveredRating ||
                                        messageRatings.get(
                                            selectedMessage.id || selectedMessage.content /* <-[??] */,
                                        ) ||
                                        0)
                                        ? '#FFD700'
                                        : mode === 'LIGHT'
                                        ? '#ccc'
                                        : '#555',
                            }}
                        >
                            ⭐
                        </span>
                    ))}
                </div>
                Your question:
                <textarea readOnly value={userQuestion} className={styles.ratingInput} />
                Expected answer:
                <textarea
                    placeholder={selectedMessage.content || 'Expected answer (optional)'}
                    defaultValue={selectedMessage.expectedAnswer || selectedMessage.content}
                    onChange={(event) => {
                        if (selectedMessage) {
                            setSelectedMessage({ ...selectedMessage, expectedAnswer: event.target.value });
                        }
                    }}
                    className={styles.ratingInput}
                />
                Note:
                <textarea
                    placeholder="Add a note (optional)"
                    defaultValue={textRating}
                    onChange={(event) => setTextRating(event.target.value)}
                    className={styles.ratingInput}
                />
                <div className={styles.ratingActions}>
                    <button onClick={onClose}>Cancel</button>
                    <button onClick={submitRating}>Submit</button>
                </div>
            </div>
        </div>
    );
}
