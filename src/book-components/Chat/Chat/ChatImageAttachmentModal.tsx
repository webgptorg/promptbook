'use client';

import { useEffect, useRef } from 'react';
import { classNames } from '../../_common/react-utils/classNames';
import { CloseIcon } from '../../icons/CloseIcon';
import type { ChatMessage } from '../types/ChatMessage';
import styles from './Chat.module.css';

/**
 * One attachment payload displayed by the chat image preview modal.
 *
 * @private type of `<ChatImageAttachmentModal/>`
 */
type ChatImageAttachment = NonNullable<ChatMessage['attachments']>[number];

/**
 * Props for the chat image attachment preview modal.
 *
 * @private props of `<ChatImageAttachmentModal/>`
 */
type ChatImageAttachmentModalProps = {
    readonly attachment: ChatImageAttachment | null;
    readonly mode?: 'LIGHT' | 'DARK';
    readonly onClose: () => void;
};

/**
 * Modal that previews an image attachment without leaving the chat surface.
 *
 * @private component of `<Chat/>`
 */
export function ChatImageAttachmentModal({ attachment, mode = 'LIGHT', onClose }: ChatImageAttachmentModalProps) {
    const modalDialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!attachment) {
            return;
        }

        const previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        window.addEventListener('keydown', handleEscape);
        modalDialogRef.current?.focus();

        return () => {
            window.removeEventListener('keydown', handleEscape);
            previouslyFocusedElement?.focus();
        };
    }, [attachment, onClose]);

    if (!attachment) {
        return null;
    }

    const attachmentName = attachment.name || 'Image attachment';

    return (
        <div
            className={styles.ratingModal}
            data-chat-modal="image-attachment"
            data-chat-theme={mode.toLowerCase()}
            onClick={(event) => {
                event.stopPropagation();

                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                ref={modalDialogRef}
                className={classNames(styles.ratingModalContent, styles.imageAttachmentModal)}
                role="dialog"
                aria-modal="true"
                aria-label={attachmentName}
                tabIndex={-1}
            >
                <button
                    type="button"
                    className={styles.modalCloseButton}
                    onClick={onClose}
                    aria-label="Close image preview"
                >
                    <CloseIcon />
                </button>
                <div className={styles.imageAttachmentModalHeader}>
                    <h3 className={styles.imageAttachmentModalTitle}>{attachmentName}</h3>
                </div>
                <div className={styles.imageAttachmentModalPreview}>
                    <img src={attachment.url} alt={attachmentName} className={styles.imageAttachmentModalImage} />
                </div>
            </div>
        </div>
    );
}
