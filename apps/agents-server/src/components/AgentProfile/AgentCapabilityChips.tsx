import { AgentBasicInformation } from '@promptbook-local/types';
import {
    Book,
    Clock8Icon,
    ExternalLink,
    FileText,
    Globe,
    Link,
    Search,
    ShieldAlert,
    ShieldQuestionMarkIcon,
    SquareArrowOutUpRight,
    SquareArrowUpRight,
    Users,
} from 'lucide-react';
import NextLink from 'next/link';
import { TeamCommitmentChip } from './TeamCommitmentChip';

type AgentCapabilityChipsProps = {
    readonly agent: AgentBasicInformation;
    readonly className?: string;
};

export function AgentCapabilityChips({ agent, className }: AgentCapabilityChipsProps) {
    if (!agent.capabilities || agent.capabilities.length === 0) {
        return null;
    }

    // Filter out VOID inheritance and group identical capabilities
    const uniqueCapabilitiesMap = new Map<string, { capability: (typeof agent.capabilities)[0]; count: number }>();

    for (const capability of agent.capabilities) {
        if (capability.agentUrl === 'VOID') {
            continue;
        }

        const key = JSON.stringify({
            type: capability.type,
            label: capability.label,
            iconName: capability.iconName,
            agentUrl: capability.agentUrl,
        });

        const existing = uniqueCapabilitiesMap.get(key);
        if (existing) {
            existing.count++;
        } else {
            uniqueCapabilitiesMap.set(key, { capability, count: 1 });
        }
    }

    const uniqueCapabilities = Array.from(uniqueCapabilitiesMap.values());

    if (uniqueCapabilities.length === 0) {
        return null;
    }

    return (
        <div className={`flex flex-wrap gap-2 ${className || ''}`}>
            {uniqueCapabilities.map(({ capability, count }, i) => {
                if (capability.type === 'team') {
                    return <TeamCommitmentChip key={i} capability={capability} />;
                }

                const Icon =
                    {
                        Globe,
                        Search,
                        Book,
                        FileText,
                        Clock: Clock8Icon,
                        SquareArrowOutUpRight,
                        SquareArrowUpRight,
                        ShieldAlert,
                        ExternalLink,
                        Link,
                        Users,
                        // <- [🪀] Add icons for new capabilities here
                    }[capability.iconName] || ShieldQuestionMarkIcon;

                const label = count > 1 ? `${capability.label} (${count})` : capability.label;

                const content = (
                    <div
                        key={i}
                        className="flex items-center gap-1.5 bg-white/50 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold text-gray-800 border border-white/20 shadow-sm"
                        title={label}
                    >
                        <Icon className="w-3.5 h-3.5 opacity-70" />
                        <span className="truncate max-w-[150px]">{label}</span>
                    </div>
                );

                if (capability.agentUrl) {
                    let href = capability.agentUrl;

                    if (href.startsWith('./') || href.startsWith('../')) {
                        // [🧠] How to resolve relative paths?
                        // For now let's assume they are relative to /agents/
                        href = `/agents/${href.split('/').pop()}`;
                    } else if (href.startsWith('/')) {
                        href = `/agents${href}`;
                    }

                    // Note: VOID check is already done above

                    return (
                        <NextLink
                            key={i}
                            href={href}
                            className="no-underline"
                            onClick={(e) => {
                                // Note: Prevent card click when clicking on the chip
                                e.stopPropagation();
                            }}
                        >
                            {content}
                        </NextLink>
                    );
                }

                return content;
            })}
        </div>
    );
}
