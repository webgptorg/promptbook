'use client';

import { CopyIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAgentNaming } from '../../../components/AgentNaming/AgentNamingContext';
import { promptCloneAgent } from '../../../components/AgentCloning/cloneAgent';

type CloneAgentButtonProps = {
    agentName: string;
};

export function CloneAgentButton({ agentName }: CloneAgentButtonProps) {
    const router = useRouter();
    const { formatText } = useAgentNaming();

    const handleClone = async () => {
        const clonedAgent = await promptCloneAgent({
            agentIdentifier: agentName,
            agentName,
            formatText,
        });
        if (!clonedAgent) {
            return;
        }

        router.push(`/agents/${encodeURIComponent(clonedAgent.agentName)}`);
        router.refresh();
    };

    return (
        <button
            onClick={handleClone}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
        >
            <CopyIcon className="mr-2 w-3 h-3" />
            Clone
        </button>
    );
}
