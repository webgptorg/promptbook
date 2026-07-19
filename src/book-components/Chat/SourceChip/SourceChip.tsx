'use client';

import {
    Archive,
    File,
    FileCode,
    FileJson,
    FileSpreadsheet,
    FileText,
    Globe2,
    ImageIcon,
    Music,
    Presentation,
    Table,
    Video,
    type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useResolvedCitationLabel } from '../hooks/useResolvedCitationLabel';
import type { CitationLabelResolver } from '../types/CitationLabelResolver';
import {
    resolveCitationSourceDisplay,
    type CitationSourceDisplay,
    type CitationSourceKind,
} from '../utils/resolveCitationSourceDisplay';
import type { ParsedCitation } from '../utils/parseCitationsFromContent';
import styles from './SourceChip.module.css';

/**
 * Icon size used by source-chip SVG graphics.
 *
 * @private utility constant of `<SourceChip/>`
 */
const SOURCE_CHIP_ICON_SIZE = 15;

/**
 * Source kind to icon map used when no thumbnail is available.
 *
 * @private utility constant of `<SourceChip/>`
 */
const SOURCE_CHIP_ICON_BY_KIND: Readonly<Record<CitationSourceKind, LucideIcon>> = {
    archive: Archive,
    audio: Music,
    code: FileCode,
    document: FileText,
    file: File,
    image: ImageIcon,
    json: FileJson,
    'plain-text': FileText,
    presentation: Presentation,
    spreadsheet: FileSpreadsheet,
    table: Table,
    video: Video,
    website: Globe2,
};

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
     * Optional resolver for richer citation labels.
     */
    resolveCitationLabel?: CitationLabelResolver;
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
export function SourceChip({
    citation,
    onClick,
    className,
    suffix,
    resolveCitationLabel,
    isCitationIdVisible = true,
}: SourceChipProps) {
    const handleClick = (event: React.MouseEvent) => {
        event.stopPropagation();
        if (onClick) {
            onClick(citation);
        }
    };

    // Keep source chips concise and human-readable for CDN-backed knowledge files.
    const displayName = useResolvedCitationLabel(citation, resolveCitationLabel);
    const sourceDisplay = resolveCitationSourceDisplay(citation);
    const title = displayName === citation.source ? citation.source : `${displayName}\n${citation.source}`;

    return (
        <button type="button" className={`${styles.sourceChip} ${className || ''}`} onClick={handleClick} title={title}>
            <SourceChipVisual sourceDisplay={sourceDisplay} />
            <span className={styles.label}>
                <span className={styles.labelText}>{displayName}</span>
                {isCitationIdVisible && <span className={styles.citationId}> [{citation.id}]</span>}
            </span>
            {suffix && <span className={styles.suffix}>{suffix}</span>}
        </button>
    );
}

/**
 * Renders either an image thumbnail or a semantic source icon.
 *
 * @private component of `<SourceChip/>`
 */
function SourceChipVisual(props: { readonly sourceDisplay: CitationSourceDisplay }) {
    const { sourceDisplay } = props;
    const [isThumbnailUnavailable, setIsThumbnailUnavailable] = useState(false);

    useEffect(() => {
        setIsThumbnailUnavailable(false);
    }, [sourceDisplay.thumbnailUrl]);

    if (sourceDisplay.thumbnailUrl && !isThumbnailUnavailable) {
        return (
            <span className={styles.icon} aria-hidden="true">
                <img
                    src={sourceDisplay.thumbnailUrl}
                    alt=""
                    className={styles.thumbnail}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={() => {
                        setIsThumbnailUnavailable(true);
                    }}
                />
            </span>
        );
    }

    const Icon = SOURCE_CHIP_ICON_BY_KIND[sourceDisplay.kind];

    return (
        <span className={styles.icon} aria-hidden="true">
            <Icon size={SOURCE_CHIP_ICON_SIZE} className={styles.iconSvg} strokeWidth={2.35} />
        </span>
    );
}
