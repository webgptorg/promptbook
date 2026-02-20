'use client';

import { useEffect, useMemo, useState } from 'react';
import spaceTrim from 'spacetrim';
import { shortenText } from '../../utils/shortenText';

const AGENT_PROFILE_DESCRIPTION_COLLAPSE_LENGTH = 320;

type AgentProfileDescriptionProps = {
    /**
     * Text that should appear in the agent description slot.
     */
    readonly text: string;
    /**
     * Additional classes applied to the paragraph.
     */
    readonly className?: string;
    /**
     * Toggle label used when the description is collapsed.
     */
    readonly collapsedLabel?: string;
    /**
     * Toggle label used when the description is expanded.
     */
    readonly expandedLabel?: string;
};

/**
 * Renders an agent description that can expand/collapse when it becomes too long.
 *
 * @private Internal helper for the agent profile view.
 */
export function AgentProfileDescription(props: AgentProfileDescriptionProps) {
    const {
        text,
        className = '',
        collapsedLabel = 'Show more',
        expandedLabel = 'Show less',
    } = props;

    const normalizedText = useMemo(() => spaceTrim(text ?? ''), [text]);
    const hasLongDescription = normalizedText.length > AGENT_PROFILE_DESCRIPTION_COLLAPSE_LENGTH;

    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        setIsExpanded(false);
    }, [normalizedText]);

    const displayedText =
        isExpanded || !hasLongDescription
            ? normalizedText
            : shortenText(normalizedText, AGENT_PROFILE_DESCRIPTION_COLLAPSE_LENGTH);

    const paragraphClassName = [
        'leading-relaxed font-medium',
        className,
        !isExpanded ? 'line-clamp-3 md:line-clamp-5' : undefined,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className="w-full">
            <p className={paragraphClassName}>{displayedText}</p>
            {hasLongDescription && (
                <button
                    type="button"
                    aria-expanded={isExpanded}
                    className="mt-3 inline-flex items-center text-xs md:text-sm font-semibold tracking-wide text-sky-600 transition hover:text-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/80"
                    onClick={() => setIsExpanded((prev) => !prev)}
                >
                    {isExpanded ? expandedLabel : collapsedLabel}
                </button>
            )}
        </div>
    );
}
