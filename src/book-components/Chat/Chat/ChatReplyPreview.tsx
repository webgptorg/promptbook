'use client';

import { CloseIcon } from '../../icons/CloseIcon';
import { classNames } from '../../_common/react-utils/classNames';
import styles from './Chat.module.css';

/**
 * Props for one faded quoted-message preview rendered inside the chat UI.
 *
 * @private component of `<Chat/>`
 */
export type ChatReplyPreviewProps = {
    readonly label: string;
    readonly senderLabel: string;
    readonly previewText: string;
    readonly className?: string;
    readonly dismissLabel?: string;
    readonly onDismiss?: () => void;
};

/**
 * Renders the common faded preview used for reply bubbles and composer reply mode.
 *
 * @private component of `<Chat/>`
 */
export function ChatReplyPreview(props: ChatReplyPreviewProps) {
    const { label, senderLabel, previewText, className, dismissLabel, onDismiss } = props;

    return (
        <div className={classNames(styles.replyPreview, className)}>
            <div className={styles.replyPreviewAccent} aria-hidden="true" />
            <div className={styles.replyPreviewBody}>
                <div className={styles.replyPreviewHeading}>
                    <span className={styles.replyPreviewLabel}>{label}</span>{' '}
                    <span className={styles.replyPreviewSender}>{senderLabel}</span>
                </div>
                <div className={styles.replyPreviewText}>{previewText}</div>
            </div>
            {onDismiss && (
                <button
                    type="button"
                    className={styles.replyPreviewDismissButton}
                    onClick={onDismiss}
                    aria-label={dismissLabel || 'Cancel reply'}
                    title={dismissLabel || 'Cancel reply'}
                >
                    <CloseIcon />
                </button>
            )}
        </div>
    );
}
