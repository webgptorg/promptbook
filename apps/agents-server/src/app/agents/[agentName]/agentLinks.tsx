import { string_agent_name, string_agent_permanent_id } from '@promptbook-local/types';
import { BookOpenIcon, CodeIcon, GlobeIcon, MessageSquareIcon, NotebookPenIcon } from 'lucide-react';
import type { ComponentType } from 'react';

type AgentLink = {
    title: string;
    href: string;
    icon: ComponentType<{ className?: string }>;
    description?: string;
    target?: '_blank' | '_self';
    rel?: string;
};

export const getAgentLinks = (permanentId: string_agent_permanent_id | string_agent_name): AgentLink[] => {
    return [
        {
            title: 'Chat with Agent',
            href: `/agents/${permanentId}`,
            icon: MessageSquareIcon,
            description: 'Direct interface to converse with the agent.',
        },
        {
            title: 'Edit Book',
            href: `/agents/${permanentId}/book`,
            icon: NotebookPenIcon,
            description: "Edit the agent's knowledge book.",
        },
        {
            title: 'Integration',
            href: `/agents/${permanentId}/integration`,
            icon: CodeIcon,
            description: 'Learn how to integrate this agent into your applications.',
        },
        {
            title: 'Website Integration',
            href: `/agents/${permanentId}/website-integration`,
            icon: GlobeIcon,
            description: 'Embed the agent chat widget directly into your React application.',
        },
    ];
};

export const getAgentExternalLinks = (): AgentLink[] => [
    {
        title: 'Promptbook Studio',
        href: 'https://promptbook.studio',
        icon: BookOpenIcon,
        description: 'Create and manage your own agents',
        target: '_blank',
        rel: 'noopener noreferrer',
    },
    {
        title: 'GitHub Repository',
        href: 'https://github.com/webgptorg/promptbook',
        icon: CodeIcon,
        description: 'Star us and contribute to the project',
        target: '_blank',
        rel: 'noopener noreferrer',
    },
];
