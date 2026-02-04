'use client';

import { classNames } from '../../_common/react-utils/classNames';
import { CloseIcon } from '../../icons/CloseIcon';
import { DownloadIcon } from '../../icons/DownloadIcon';
import { MarkdownContent } from '../MarkdownContent/MarkdownContent';
import type { ChatParticipant } from '../types/ChatParticipant';
import type { ParsedCitation } from '../utils/parseCitationsFromContent';
import { resolveCitationUrl } from '../utils/resolveCitationUrl';
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

    const resolvedUrl = citation.url || resolveCitationUrl(citation.source, participants);
    const isValidUrl = !!resolvedUrl;
    const extension = citation.source.split('.').pop()?.toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension || '');

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
                    <h3 className={styles.searchModalQuery}>{citation.source}</h3>
                </div>

                <div className={styles.searchModalContent}>
                    <div className={styles.citationDetails}>
                        {isValidUrl ? (
                            <div className={styles.citationPreview}>
                                {isImage ? (
                                    <img
                                        src={resolvedUrl}
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
                                        src={resolvedUrl}
                                        className={styles.citationIframe}
                                        title={`Preview of ${citation.source}`}
                                    />
                                )}
                            </div>
                        ) : citation.excerpt ? (
                            <div className={styles.citationExcerpt}>
                                <h4>Excerpt:</h4>
                                <MarkdownContent content={citation.excerpt} />
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
                    {resolvedUrl && (
                        <a
                            href={resolvedUrl}
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
