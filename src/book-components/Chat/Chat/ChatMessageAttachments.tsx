'use client';

import { useState, type CSSProperties } from 'react';
import { classNames } from '../../_common/react-utils/classNames';
import { CloseIcon } from '../../icons/CloseIcon';
import type { ChatMessage } from '../types/ChatMessage';
import styles from './Chat.module.css';
import { ChatImageAttachmentModal } from './ChatImageAttachmentModal';

/**
 * One uploaded file attached to a chat message.
 *
 * @private type of `<Chat/>`
 */
export type ChatMessageAttachment = NonNullable<ChatMessage['attachments']>[number];

/**
 * File extensions treated as image attachments when the MIME type is missing.
 *
 * @private constant of `<ChatMessageAttachments/>`
 */
const IMAGE_ATTACHMENT_EXTENSIONS = new Set(['avif', 'gif', 'jpg', 'jpeg', 'png', 'svg', 'webp']);

/**
 * Props accepted by the shared attachment chip list.
 *
 * @private props of `<Chat/>`
 */
type ChatMessageAttachmentsProps = {
    readonly attachments: ReadonlyArray<ChatMessageAttachment>;
    readonly mode: 'LIGHT' | 'DARK';
    readonly className?: string;
    readonly style?: CSSProperties;
    readonly onRemoveAttachment?: (attachment: ChatMessageAttachment, attachmentIndex: number) => void;
};

/**
 * Returns whether the attachment should open in the in-chat image preview.
 *
 * @private function of `<ChatMessageAttachments/>`
 */
function isImageChatMessageAttachment(attachment: ChatMessageAttachment): boolean {
    if (attachment.type.toLowerCase().startsWith('image/')) {
        return true;
    }

    const extension =
        getChatMessageAttachmentExtension(attachment.url) || getChatMessageAttachmentExtension(attachment.name);

    return Boolean(extension && IMAGE_ATTACHMENT_EXTENSIONS.has(extension));
}

/**
 * Gets a file extension from an attachment URL or name.
 *
 * @private function of `<ChatMessageAttachments/>`
 */
function getChatMessageAttachmentExtension(value: string): string | null {
    const pathname = value.split(/[?#]/)[0] ?? '';
    const filename = pathname.split(/[\\/]/).pop();

    if (!filename || !filename.includes('.')) {
        return null;
    }

    return filename.split('.').pop()?.toLowerCase() || null;
}

/**
 * Renders the shared clickable body of one attachment chip.
 *
 * @private component of `<ChatMessageAttachments/>`
 */
function ChatMessageAttachmentChipBody(props: {
    readonly attachment: ChatMessageAttachment;
    readonly isImageAttachment: boolean;
    readonly className?: string;
    readonly onOpenImageAttachment: (attachment: ChatMessageAttachment) => void;
}) {
    const { attachment, isImageAttachment, className, onOpenImageAttachment } = props;
    const content = (
        <>
            <span className={styles.attachmentIcon}>📎</span>
            <span className={styles.attachmentName}>{attachment.name}</span>
        </>
    );

    if (isImageAttachment) {
        return (
            <button
                type="button"
                className={className || styles.attachment}
                title={attachment.name}
                aria-label={`Open image attachment ${attachment.name}`}
                onPointerDown={(event) => {
                    event.stopPropagation();
                }}
                onClick={(event) => {
                    event.stopPropagation();
                    onOpenImageAttachment(attachment);
                }}
            >
                {content}
            </button>
        );
    }

    return (
        <a
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className={className || styles.attachment}
            title={attachment.name}
        >
            {content}
        </a>
    );
}

/**
 * Renders one attachment chip, optionally with composer removal controls.
 *
 * @private component of `<ChatMessageAttachments/>`
 */
function ChatMessageAttachmentChip(props: {
    readonly attachment: ChatMessageAttachment;
    readonly attachmentIndex: number;
    readonly onOpenImageAttachment: (attachment: ChatMessageAttachment) => void;
    readonly onRemoveAttachment?: (attachment: ChatMessageAttachment, attachmentIndex: number) => void;
}) {
    const { attachment, attachmentIndex, onOpenImageAttachment, onRemoveAttachment } = props;
    const isImageAttachment = isImageChatMessageAttachment(attachment);

    if (!onRemoveAttachment) {
        return (
            <ChatMessageAttachmentChipBody
                attachment={attachment}
                isImageAttachment={isImageAttachment}
                onOpenImageAttachment={onOpenImageAttachment}
            />
        );
    }

    return (
        <span className={classNames(styles.attachment, styles.attachmentWithRemove)} title={attachment.name}>
            <ChatMessageAttachmentChipBody
                attachment={attachment}
                isImageAttachment={isImageAttachment}
                className={styles.attachmentMainAction}
                onOpenImageAttachment={onOpenImageAttachment}
            />
            <button
                type="button"
                className={styles.attachmentRemoveButton}
                onPointerDown={(event) => {
                    event.stopPropagation();
                }}
                onClick={(event) => {
                    event.stopPropagation();
                    onRemoveAttachment(attachment, attachmentIndex);
                }}
                aria-label={`Remove attachment ${attachment.name}`}
                title="Remove attachment"
            >
                <CloseIcon />
            </button>
        </span>
    );
}

/**
 * Renders chat attachment chips and the shared image preview modal.
 *
 * @private component of `<Chat/>`
 */
export function ChatMessageAttachments({
    attachments,
    mode,
    className,
    style,
    onRemoveAttachment,
}: ChatMessageAttachmentsProps) {
    const [selectedImageAttachment, setSelectedImageAttachment] = useState<ChatMessageAttachment | null>(null);

    if (attachments.length === 0) {
        return null;
    }

    return (
        <>
            <div className={classNames(styles.attachments, className)} style={style}>
                {attachments.map((attachment, index) => (
                    <ChatMessageAttachmentChip
                        key={`${attachment.url}-${attachment.name}-${index}`}
                        attachment={attachment}
                        attachmentIndex={index}
                        onOpenImageAttachment={setSelectedImageAttachment}
                        onRemoveAttachment={onRemoveAttachment}
                    />
                ))}
            </div>
            <ChatImageAttachmentModal
                attachment={selectedImageAttachment}
                mode={mode}
                onClose={() => {
                    setSelectedImageAttachment(null);
                }}
            />
        </>
    );
}
