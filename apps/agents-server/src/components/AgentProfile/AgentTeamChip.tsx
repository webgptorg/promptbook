'use client';

import { string_url } from '@promptbook-local/types';
import { useEffect, useState } from 'react';

// [🧠] Note: Using explicit relative path because of module resolution issues in Next.js environment
// @ts-expect-error - Relative path to src directory outside of app directory
import { loadAgentProfile, resolveAgentProfileFallback, shouldFetchAgentProfile } from '../../../../src/book-components/Chat/utils/loadAgentProfile';

type AgentTeamChipProps = {
    readonly agentUrl: string_url;
    readonly label?: string;
};

/**
 * Enhanced chip for TEAM commitment that shows agent profile picture and name.
 */
export function AgentTeamChip({ agentUrl, label }: AgentTeamChipProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [agentLabel, setAgentLabel] = useState<string>(label || 'Teammate');

    useEffect(() => {
        let isMounted = true;
        const agentInput = { url: agentUrl, label };
        const fallback = resolveAgentProfileFallback(agentInput);

        setAgentLabel(fallback.label);
        setImageUrl(fallback.imageUrl);

        if (!shouldFetchAgentProfile(agentInput)) {
            return () => {
                isMounted = false;
            };
        }

        loadAgentProfile(agentInput).then((profile: { label: string; imageUrl: string | null }) => {
            if (!isMounted) {
                return;
            }

            setAgentLabel(profile.label);
            setImageUrl(profile.imageUrl);
        });

        return () => {
            isMounted = false;
        };
    }, [agentUrl, label]);

    return (
        <div
            className="flex items-center gap-1.5 bg-white/50 backdrop-blur-sm px-1.5 py-0.5 rounded-full text-xs font-semibold text-gray-800 border border-white/20 shadow-sm transition-all hover:bg-white/70"
            title={agentUrl}
        >
            {imageUrl && (
                <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0 bg-black/10">
                    <img src={imageUrl} alt={agentLabel} className="w-full h-full object-cover" />
                </div>
            )}
            <span className="truncate max-w-[120px]">{agentLabel}</span>
        </div>
    );
}
