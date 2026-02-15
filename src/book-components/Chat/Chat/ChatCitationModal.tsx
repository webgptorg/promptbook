'use client';

import { classNames } from '../../_common/react-utils/classNames';
import { CloseIcon } from '../../icons/CloseIcon';
import { DownloadIcon } from '../../icons/DownloadIcon';
import { MarkdownContent } from '../MarkdownContent/MarkdownContent';
import type { ChatParticipant } from '../types/ChatParticipant';
import { getCitationLabel, isPlainTextCitation, resolveCitationPreviewUrl } from '../utils/citationHelpers';
import type { ParsedCitation } from '../utils/parseCitationsFromContent';
import styles from './Chat.module.css';
import type { ChatSoundSystem } from './ChatProps';

/**
 * Props for the citation preview modal.
 *
 * @private component of `<Chat/>`
 */
export type ChatCitationModalProps = {
    isOpen: boolean;
    citation: ParsedCitation | null;
    participants: ReadonlyArray<ChatParticipant>;
    soundSystem?: ChatSoundSystem;
    onClose: () => void;
};

/**
 * Modal that previews a citation source or excerpt.
 *
 * @private component of `<Chat/>`
 */
export function ChatCitationModal(props: ChatCitationModalProps) {
    const { isOpen, citation, participants, soundSystem, onClose } = props;

    if (!isOpen || !citation) {
        return null;
    }

    const previewUrl = resolveCitationPreviewUrl(citation, participants);
    const isValidUrl = !!previewUrl;
    const previewTarget = previewUrl ?? citation.source;
    const previewBase = previewTarget.split(/[?#]/)[0]!;
    const previewSegment = previewBase.split('/').pop() || previewBase;
    const extension = previewSegment.split('.').pop()?.toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension || '');
    const label = getCitationLabel(citation);
    const isTextCitation = isPlainTextCitation(citation);
    const hasTextPreview = !isValidUrl && (citation.excerpt || isTextCitation);
    const textPreviewContent = isTextCitation ? citation.source : citation.excerpt ?? '';
    const textPreviewHeading = isTextCitation ? 'Text:' : 'Excerpt:';

    return (
        <div
            className={styles.ratingModal}
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className={classNames(styles.ratingModalContent, styles.toolCallModal)}>
                <button type="button" className={styles.modalCloseButton} onClick={onClose} aria-label="Close dialog">
                    <CloseIcon />
                </button>
                <div className={styles.searchModalHeader}>
                    <span className={styles.searchModalIcon}>📄</span>
                    <h3 className={styles.searchModalQuery}>{label}</h3>
                </div>

                <div className={styles.searchModalContent}>
                    <div className={styles.citationDetails}>
                        {isValidUrl ? (
                            <div className={styles.citationPreview}>
                                {isImage ? (
                                    <img
                                        src={previewUrl ?? citation.source}
                                        className={styles.citationImage}
                                        alt={`Preview of ${citation.source}`}
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: '100%',
                                            objectFit: 'contain',
                                            display: 'block',
                                            margin: '0 auto',
                                        }}
                                    />
                                ) : (
                                    <iframe
                                        src={previewUrl ?? citation.source}
                                        className={styles.citationIframe}
                                        title={`Preview of ${label}`}
                                    />
                                )}
                            </div>
                        ) : hasTextPreview ? (
                            <div className={styles.citationExcerpt}>
                                <h4>{textPreviewHeading}</h4>
                                <MarkdownContent content={textPreviewContent} />
                            </div>
                        ) : (
                            <div
                                className={styles.noResults}
                                onClick={() => {
                                    console.info({ citation });
                                }}
                            >
                                <p>📄 Document preview unavailable</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.ratingActions}>
                    {previewUrl && (
                        <a
                            href={previewUrl}
                            download={citation.source}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.downloadButton}
                            onClick={() => {
                                if (soundSystem) {
                                    /* not await */ soundSystem.play('button_click');
                                }
                            }}
                        >
                            <DownloadIcon size={18} />
                            <span>Download</span>
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}
