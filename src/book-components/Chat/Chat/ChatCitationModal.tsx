'use client';

import { useCallback, useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { classNames } from '../../_common/react-utils/classNames';
import { CloseIcon } from '../../icons/CloseIcon';
import { DownloadIcon } from '../../icons/DownloadIcon';
import { MarkdownContent } from '../MarkdownContent/MarkdownContent';
import type { ChatParticipant } from '../types/ChatParticipant';
import type { ParsedCitation } from '../utils/parseCitationsFromContent';
import { resolveCitationUrl } from '../utils/resolveCitationUrl';
import styles from './Chat.module.css';
import type { ChatSoundSystem } from './ChatProps';

if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
}

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
    const [pdfPageCount, setPdfPageCount] = useState<number>(0);
    const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);

    if (!isOpen || !citation) {
        return null;
    }

    const resolvedUrl = citation.url || resolveCitationUrl(citation.source, participants);
    const isValidUrl = !!resolvedUrl;
    const sourcePath = citation.source.split('?')[0]!.split('#')[0]!;
    const resolvedPath = resolvedUrl ? resolvedUrl.split('?')[0]!.split('#')[0]! : '';
    const extension = sourcePath.split('.').pop()?.toLowerCase() || resolvedPath.split('.').pop()?.toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension || '');
    const isPdf = extension === 'pdf';
    const shouldRenderPdf = isValidUrl && isPdf;

    /**
     * Handles successful PDF load events by capturing the page count.
     *
     * @param pdf - Loaded PDF document proxy.
     */
    const handlePdfLoadSuccess = useCallback((pdf: PDFDocumentProxy) => {
        setPdfPageCount(pdf.numPages);
        setPdfLoadError(null);
    }, []);

    /**
     * Handles PDF load errors by clearing pages and showing a fallback message.
     *
     * @param error - Error thrown while loading the PDF.
     */
    const handlePdfLoadError = useCallback((error: Error) => {
        console.error('Failed to load PDF preview', error);
        setPdfPageCount(0);
        setPdfLoadError('PDF preview unavailable.');
    }, []);

    useEffect(() => {
        setPdfPageCount(0);
        setPdfLoadError(null);
    }, [resolvedUrl]);

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
                                ) : shouldRenderPdf ? (
                                    <div className={styles.citationPdfPreview}>
                                        {pdfLoadError ? (
                                            <div className={styles.citationPdfError}>{pdfLoadError}</div>
                                        ) : (
                                            <Document
                                                file={resolvedUrl}
                                                onLoadSuccess={handlePdfLoadSuccess}
                                                onLoadError={handlePdfLoadError}
                                                loading={
                                                    <div className={styles.citationPdfLoading}>
                                                        Loading PDF preview...
                                                    </div>
                                                }
                                                error={
                                                    <div className={styles.citationPdfError}>
                                                        PDF preview unavailable.
                                                    </div>
                                                }
                                                className={styles.citationPdfDocument}
                                            >
                                                {Array.from({ length: pdfPageCount }, (_, index) => (
                                                    <Page
                                                        key={`page_${index + 1}`}
                                                        pageNumber={index + 1}
                                                        width={720}
                                                        renderTextLayer={false}
                                                        renderAnnotationLayer={false}
                                                        className={styles.citationPdfPage}
                                                    />
                                                ))}
                                            </Document>
                                        )}
                                    </div>
                                ) : citation.excerpt ? (
                                    <div className={styles.citationExcerpt}>
                                        <h4>Excerpt:</h4>
                                        <MarkdownContent content={citation.excerpt} />
                                    </div>
                                ) : (
                                    <div className={styles.noResults}>
                                        <p>?? Document preview unavailable</p>
                                    </div>
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
