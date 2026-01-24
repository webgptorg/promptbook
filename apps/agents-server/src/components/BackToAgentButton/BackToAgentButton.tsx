import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';
import type { FC } from 'react';

/**
 * Properties for the BackToAgentButton component
 */
type BackToAgentButtonProps = {
    /**
     * The unique name or ID of the agent
     */
    readonly agentName: string;
};

/**
 * Build the link to an agent profile page.
 *
 * @param {string} agentName - The unique name or ID of the agent.
 * @returns {string} The URL for the agent profile page.
 */
export function getBackToAgentHref(agentName: string): string {
    return `/agents/${encodeURIComponent(agentName)}`;
}

/**
 * A reusable button component that links back to the agent's main page.
 *
 * @param {BackToAgentButtonProps} props - The component props
 * @returns {JSX.Element} The rendered button component
 */
export const BackToAgentButton: FC<BackToAgentButtonProps> = ({ agentName }) => {
    return (
        <Link
            href={getBackToAgentHref(agentName)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            title="Back to Agent"
        >
            <ArrowLeftIcon className="w-6 h-6" />
        </Link>
    );
};
