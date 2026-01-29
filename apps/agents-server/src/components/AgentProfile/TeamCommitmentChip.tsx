'use client';

import { string_url } from '@promptbook-local/types';
import { Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    loadAgentProfile,
    resolveAgentProfileFallback,
    shouldFetchAgentProfile,
} from '../../../../../src/book-components/Chat/utils/loadAgentProfile';

type TeamCommitmentChipProps = {
    readonly url: string_url;
    readonly label: string;
    readonly className?: string;
};

export function TeamCommitmentChip({ url, label: initialLabel, className }: TeamCommitmentChipProps) {
    const agentInput = { url, label: initialLabel };
    const [imageUrl, setImageUrl] = useState<string | null>(() => resolveAgentProfileFallback(agentInput).imageUrl);
    const [agentLabel, setAgentLabel] = useState<string>(() => resolveAgentProfileFallback(agentInput).label);

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
            className={`flex items-center gap-1.5 bg-white/50 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold text-gray-800 border border-white/20 shadow-sm ${
                className || ''
            }`}
            title={agentLabel}
        >
            {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={agentLabel} className="w-3.5 h-3.5 rounded-full object-cover opacity-90" />
            ) : (
                <Users className="w-3.5 h-3.5 opacity-70" />
            )}
            <span className="truncate max-w-[150px]">{agentLabel}</span>
        </div>
    );
}
