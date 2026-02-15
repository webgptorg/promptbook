'use client';

import { simplifyKnowledgeLabel } from '../../../utils/knowledge/simplifyKnowledgeLabel';
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
};

/**
 * SourceChip component - displays a chip with source document information
 *
 * This component is used to display RAG source citations in chat messages.
 * It displays the source document name and citation ID.
 *
 * @example
 * ```tsx
 * <SourceChip
 *   citation={{ id: '5:13', source: 'document.pdf' }}
 *   onClick={(citation) => console.log('clicked', citation)}
 * />
 * ```
 *
 * @private utility of `ChatMessageItem` component
 */
export function SourceChip({ citation, onClick, className, suffix }: SourceChipProps) {
    const handleClick = (event: React.MouseEvent) => {
        event.stopPropagation();
        if (onClick) {
            onClick(citation);
        }
    };

    // Keep source chips concise and human-readable for CDN-backed knowledge files.
    const displayName = simplifyKnowledgeLabel(citation.source);

    // Get file extension for icon
    const fileExtension = citation.source.split('.').pop()?.toLowerCase() || 'file';
    const icon = getFileIcon(fileExtension);

    return (
        <button className={`${styles.sourceChip} ${className || ''}`} onClick={handleClick} title={citation.source}>
            <span className={styles.icon}>{icon}</span>
            <span className={styles.label}>
                {displayName}
                <span className={styles.citationId}> [{citation.id}]</span>
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
