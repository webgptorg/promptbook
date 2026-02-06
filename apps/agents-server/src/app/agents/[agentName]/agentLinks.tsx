import { string_agent_name, string_agent_permanent_id } from '@promptbook-local/types';
import { BookOpenIcon, CodeIcon, GlobeIcon, MessageSquareIcon, NotebookPenIcon } from 'lucide-react';
import type { ComponentType } from 'react';

/**
 * Identifier for agent-specific navigation links.
 */
export type AgentLinkId = 'chat' | 'book' | 'integration' | 'website';

/**
 * Text formatter applied to agent-facing UI labels.
 */
export type AgentLinkFormatter = (text: string) => string;

/**
 * Link metadata for agent navigation items.
 */
type AgentLink = {
    id?: AgentLinkId;
    title: string;
    href: string;
    icon: ComponentType<{ className?: string }>;
    description?: string;
    target?: '_blank' | '_self';
    rel?: string;
};

/**
 * Default formatter that keeps text unchanged.
 */
const identityFormatter: AgentLinkFormatter = (text) => text;

/**
 * Builds navigation links for a single agent.
 *
 * @param permanentId - Agent identifier used for link routing.
 * @param formatText - Optional formatter for user-facing copy.
 * @returns Agent navigation links.
 */
export const getAgentLinks = (
    permanentId: string_agent_permanent_id | string_agent_name,
    formatText: AgentLinkFormatter = identityFormatter,
): AgentLink[] => {
    return [
        {
            id: 'chat',
            title: formatText('Chat with Agent'),
            href: `/agents/${permanentId}`,
            icon: MessageSquareIcon,
            description: formatText('Direct interface to converse with the agent.'),
        },
        {
            id: 'book',
            title: formatText('Edit Book'),
            href: `/agents/${permanentId}/book`,
            icon: NotebookPenIcon,
            description: formatText("Edit the agent's knowledge book."),
        },
        {
            id: 'integration',
            title: formatText('Integration'),
            href: `/agents/${permanentId}/integration`,
            icon: CodeIcon,
            description: formatText('Learn how to integrate this agent into your applications.'),
        },
        {
            id: 'website',
            title: formatText('Website Integration'),
            href: `/agents/${permanentId}/website-integration`,
            icon: GlobeIcon,
            description: formatText('Embed the agent chat widget directly into your React application.'),
        },
    ];
};

/**
 * Builds external links that are relevant to agent users.
 *
 * @param formatText - Optional formatter for user-facing copy.
 * @returns External navigation links.
 */
export const getAgentExternalLinks = (formatText: AgentLinkFormatter = identityFormatter): AgentLink[] => [
    {
        title: 'Promptbook Studio',
        href: 'https://promptbook.studio',
        icon: BookOpenIcon,
        description: formatText('Create and manage your own agents'),
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
