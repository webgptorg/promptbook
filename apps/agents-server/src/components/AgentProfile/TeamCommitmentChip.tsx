'use client';

import { usePromise } from '@common/hooks/usePromise';
import { generatePlaceholderAgentProfileImageUrl } from '@promptbook-local/core';
import { RemoteAgent } from '@promptbook-local/core';
import { AgentBasicInformation, AgentCapability } from '@promptbook-local/types';
import { Loader2 } from 'lucide-react';
import NextLink from 'next/link';
import { useMemo } from 'react';
import { AgentProfileImage } from './AgentProfileImage';

type TeamCommitmentChipProps = {
    readonly capability: AgentCapability;
    readonly className?: string;
};

export function TeamCommitmentChip({ capability, className }: TeamCommitmentChipProps) {
    const agentUrl = capability.agentUrl;

    const agentPromise = useMemo(() => {
        if (!agentUrl) {
            return Promise.resolve(null);
        }
        return RemoteAgent.connect({
            agentUrl,
            isVerbose: false,
        });
    }, [agentUrl]);

    const { value: agent, isComplete } = usePromise(agentPromise, [agentPromise]);
    const loading = !isComplete;

    // Fallback content if loading or failed
    const content = (
        <div
            className={`flex items-center gap-1.5 bg-white/50 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold text-gray-800 border border-white/20 shadow-sm ${
                className || ''
            }`}
            title={capability.label}
        >
            {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin opacity-70" />
            ) : (
                <>
                    {/* If we have agent, show avatar. If not, show icon or fallback */}
                    {agent ? (
                        <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0">
                            <AgentProfileImage
                                src={
                                    agent.meta.image ||
                                    generatePlaceholderAgentProfileImageUrl(
                                        (agent as unknown as AgentBasicInformation).permanentId || '0',
                                        'https://ptbk.io' /* <- TODO: [🧠] Is this okay default? */,
                                    )
                                }
                                alt={agent.agentName}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ) : (
                        // <Icon className="w-3.5 h-3.5 opacity-70" />
                        // We don't have the icon here passed easily, maybe we should just return null and let parent handle fallback if we want to be pure?
                        // But we want to handle the loading state here.
                        // Let's just use a placeholder or assume parent handles non-team chips.
                        <span className="w-3.5 h-3.5 rounded-full bg-gray-400 opacity-70" />
                    )}

                    <span className="truncate max-w-[150px]">
                        {agent ? agent.meta.fullname || agent.agentName : capability.label}
                    </span>
                </>
            )}
        </div>
    );

    if (agentUrl) {
        let href = agentUrl;
        if (href.startsWith('./') || href.startsWith('../')) {
            href = `/agents/${href.split('/').pop()}`;
        } else if (href.startsWith('/')) {
            href = `/agents${href}`;
        }

        return (
            <NextLink
                href={href}
                className="no-underline"
                onClick={(e) => {
                    e.stopPropagation();
                }}
            >
                {content}
            </NextLink>
        );
    }

    return content;
}
