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
 * A reusable button component that links back to the agent's main page.
 * 
 * @param {BackToAgentButtonProps} props - The component props
 * @returns {JSX.Element} The rendered button component
 */
export const BackToAgentButton: FC<BackToAgentButtonProps> = ({ agentName }) => {
    return (
        <Link
            href={`/agents/${encodeURIComponent(agentName)}`}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            title="Back to Agent"
        >
            <ArrowLeftIcon className="w-6 h-6" />
        </Link>
    );
};
