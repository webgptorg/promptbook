'use client';

import { getCitationLabel, isCitationUrl, isPlainTextCitation } from '../utils/citationHelpers';
import type { ParsedCitation } from '../utils/parseCitationsFromContent';
import styles from './SourceChip.module.css';

/**
 * Props for SourceChip component
 */
export type SourceChipProps = {
    /**
     * Citation data to display
     */
    citation: ParsedCitation;

    /**
     * Click handler
     */
    onClick?: (citation: ParsedCitation) => void;

    /**
     * Additional CSS class name
     */
    className?: string;
    /**
     * Optional suffix text to display after the citation label.
     */
    suffix?: string;
    /**
     * Controls whether the technical citation id is shown inside the chip label.
     */
    isCitationIdVisible?: boolean;
};

/**
 * SourceChip component - displays a chip with source document information
 *
 * This component is used to display RAG source citations in chat messages.
 * It displays the source document name and citation ID.
 *
 * ```tsx
 * <SourceChip
 * citation={{ id: '5:13', source: 'document.pdf' }}
 * onClick={(citation) => console.log('clicked', citation)}
 * />
 * ```
 *
 * @example
 *
 * @private utility of `ChatMessageItem` component
 */
export function SourceChip({ citation, onClick, className, suffix, isCitationIdVisible = true }: SourceChipProps) {
    const handleClick = (event: React.MouseEvent) => {
        event.stopPropagation();
        if (onClick) {
            onClick(citation);
        }
    };

    // Keep source chips concise and human-readable for CDN-backed knowledge files.
    const normalizedSource = citation.source.trim();
    const displayName = getCitationLabel(citation);

    // Get file extension for icon
    const fileExtension = (normalizedSource || citation.source).split('.').pop()?.toLowerCase() || 'file';
    const icon = isPlainTextCitation(citation)
        ? '📝'
        : isCitationUrl(normalizedSource)
        ? '🌐'
        : getFileIcon(fileExtension);

    return (
        <button className={`${styles.sourceChip} ${className || ''}`} onClick={handleClick} title={citation.source}>
            <span className={styles.icon}>{icon}</span>
            <span className={styles.label}>
                {displayName}
                {isCitationIdVisible && <span className={styles.citationId}> [{citation.id}]</span>}
            </span>
            {suffix && <span className={styles.suffix}>{suffix}</span>}
        </button>
    );
}

/**
 * Gets an appropriate emoji icon for a file type
 */
function getFileIcon(extension: string): string {
    const iconMap: Record<string, string> = {
        pdf: '📄',
        doc: '📝',
        docx: '📝',
        txt: '📝',
        md: '📝',
        html: '🌐',
        htm: '🌐',
        json: '📋',
        xml: '📋',
        csv: '📊',
        xls: '📊',
        xlsx: '📊',
        ppt: '📊',
        pptx: '📊',
        jpg: '🖼️',
        jpeg: '🖼️',
        png: '🖼️',
        gif: '🖼️',
        svg: '🖼️',
        mp4: '🎥',
        mov: '🎥',
        avi: '🎥',
        mp3: '🎵',
        wav: '🎵',
        zip: '📦',
        rar: '📦',
        tar: '📦',
        gz: '📦',
    };

    return iconMap[extension] || '📄';
}
