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

type AgentCapabilityChipsProps = {
    readonly agent: AgentBasicInformation;
    readonly className?: string;
};

export function AgentCapabilityChips({ agent, className }: AgentCapabilityChipsProps) {
    if (!agent.capabilities || agent.capabilities.length === 0) {
        return null;
    }

    return (
        <div className={`flex flex-wrap gap-2 ${className || ''}`}>
            {agent.capabilities.map((capability, i) => {
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

                const content = (
                    <div
                        key={i}
                        className="flex items-center gap-1.5 bg-white/50 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold text-gray-800 border border-white/20 shadow-sm"
                        title={capability.label}
                    >
                        <Icon className="w-3.5 h-3.5 opacity-70" />
                        <span className="truncate max-w-[150px]">{capability.label}</span>
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

                    if (href === 'VOID') {
                        return content;
                    }

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
