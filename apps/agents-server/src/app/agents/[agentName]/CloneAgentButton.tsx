'use client';

import { CopyIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

type CloneAgentButtonProps = {
    agentName: string;
};

export function CloneAgentButton({ agentName }: CloneAgentButtonProps) {
    const router = useRouter();

    const handleClone = async () => {
        if (!window.confirm(`Clone agent "${agentName}"?`)) return;
        
        try {
            const response = await fetch(`/api/agents/${encodeURIComponent(agentName)}/clone`, { method: 'POST' });
            
            if (!response.ok) {
                throw new Error('Failed to clone agent');
            }

            const newAgent = await response.json();
            router.push(`/${newAgent.agentName}`);
            router.refresh();
        } catch (error) {
            alert('Failed to clone agent');
            console.error(error);
        }
    };

    return (
        <button
            onClick={handleClone}
            className="flex-1 inline-flex items-center justify-center whitespace-nowrap bg-white hover:bg-gray-100 text-gray-800 px-4 py-2 rounded shadow font-semibold transition border border-gray-200"
        >
            <CopyIcon className="ml-2 w-4 h-4 mr-2" />
            Clone
        </button>
    );
}
