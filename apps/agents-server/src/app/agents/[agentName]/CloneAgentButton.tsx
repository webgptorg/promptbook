'use client';

import { CopyIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { showAlert, showConfirm } from '../../../components/AsyncDialogs/asyncDialogs';

type CloneAgentButtonProps = {
    agentName: string;
};

export function CloneAgentButton({ agentName }: CloneAgentButtonProps) {
    const router = useRouter();

    const handleClone = async () => {
        const confirmed = await showConfirm({
            title: 'Clone agent',
            message: `Clone agent "${agentName}"?`,
            confirmLabel: 'Clone agent',
            cancelLabel: 'Cancel',
        }).catch(() => false);
        if (!confirmed) return;

        try {
            const response = await fetch(`/api/agents/${encodeURIComponent(agentName)}/clone`, { method: 'POST' });

            if (!response.ok) {
                throw new Error('Failed to clone agent');
            }

            const newAgent = await response.json();
            router.push(`/${newAgent.agentName}`);
            router.refresh();
        } catch (error) {
            await showAlert({
                title: 'Clone failed',
                message: 'Failed to clone agent',
            }).catch(() => undefined);
            console.error(error);
        }
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
