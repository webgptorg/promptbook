'use client';

import { string_url } from '@promptbook-local/types';
import { Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    loadAgentProfile,
    resolveAgentProfileFallback,
    shouldFetchAgentProfile,
} from '../../../../../src/book-components/Chat/utils/loadAgentProfile';

/**
 * Props for TeamCommitmentChip.
 */
type TeamCommitmentChipProps = {
    /**
     * Team agent URL for navigation and profile lookup.
     */
    readonly url: string_url;
    /**
     * Initial label to show before profile lookup resolves.
     */
    readonly label: string;
    /**
     * Optional class overrides for the chip container.
     */
    readonly className?: string;
    /**
     * Visual size preset for the chip.
     */
    readonly size?: TeamCommitmentChipSize;
};

/**
 * Size options for the team commitment chip.
 */
type TeamCommitmentChipSize = 'default' | 'compact';

/**
 * Renders a team capability chip with optional profile image lookup.
 */
export function TeamCommitmentChip({
    url,
    label: initialLabel,
    className,
    size = 'default',
}: TeamCommitmentChipProps) {
    const agentInput = { url, label: initialLabel };
    const [imageUrl, setImageUrl] = useState<string | null>(() => resolveAgentProfileFallback(agentInput).imageUrl);
    const [agentLabel, setAgentLabel] = useState<string>(() => resolveAgentProfileFallback(agentInput).label);
    const chipPaddingClass = size === 'compact' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
    const iconSizeClass = size === 'compact' ? 'w-3 h-3' : 'w-3.5 h-3.5';

    useEffect(() => {
        let isMounted = true;
        const fallback = resolveAgentProfileFallback(agentInput);

        setAgentLabel(fallback.label);
        setImageUrl(fallback.imageUrl);

        if (!shouldFetchAgentProfile(agentInput)) {
            return;
        }

        loadAgentProfile(agentInput).then((profile) => {
            if (!isMounted) {
                return;
            }

            setAgentLabel(profile.label);
            setImageUrl(profile.imageUrl);
        });

        return () => {
            isMounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url, initialLabel]);

    return (
        <div
            className={`flex items-center gap-1.5 bg-white/50 backdrop-blur-sm rounded-full font-semibold text-gray-800 border border-white/20 shadow-sm ${chipPaddingClass} ${
                className || ''
            }`}
            title={agentLabel}
        >
            {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={agentLabel} className={`${iconSizeClass} rounded-full object-cover opacity-90`} />
            ) : (
                <Users className={`${iconSizeClass} opacity-70`} />
            )}
            <span className="truncate max-w-[150px]">{agentLabel}</span>
        </div>
    );
}
