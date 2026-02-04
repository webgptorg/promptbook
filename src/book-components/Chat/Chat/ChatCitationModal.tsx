'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { classNames } from '../../_common/react-utils/classNames';
import { CloseIcon } from '../../icons/CloseIcon';
import { DownloadIcon } from '../../icons/DownloadIcon';
import { MarkdownContent } from '../MarkdownContent/MarkdownContent';
import type { ChatParticipant } from '../types/ChatParticipant';
import type { ParsedCitation } from '../utils/parseCitationsFromContent';
import { resolveCitationUrl } from '../utils/resolveCitationUrl';
import styles from './Chat.module.css';
import type { ChatSoundSystem } from './ChatProps';

const Document = dynamic(
    () =>
        import('react-pdf').then((mod) => {
            // [🎞] This is a bit of a hack. We should probably have a more robust way of handling this.
            //           The best way would be to NOT depend on external file but embed the worker in the bundle.
            //           @see https://github.com/wojtekmaj/react-pdf/tree/main/packages/react-pdf#pdfjs-worker
            mod.pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
            return mod.Document;
        }),
    {
    ssr: false,
    loading: () => <p>Loading PDF viewer...</p>,
});

const Page = dynamic(() => import('react-pdf').then((mod) => mod.Page), {
    ssr: false,
});

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

    const [numPages, setNumPages] = useState<number>();

    if (!isOpen || !citation) {
        return null;
    }

    const resolvedUrl = citation.url || resolveCitationUrl(citation.source, participants);
    const isValidUrl = !!resolvedUrl;
    const extension = citation.source.split('.').pop()?.toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension || '');
    const isPdf = extension === 'pdf';

    function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
        setNumPages(numPages);
    }

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
                                ) : isPdf ? (
                                    <Document file={resolvedUrl} onLoadSuccess={onDocumentLoadSuccess}>
                                        {Array.from(new Array(numPages), (el, index) => (
                                            <Page key={`page_${index + 1}`} pageNumber={index + 1} />
                                        ))}
                                    </Document>
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
