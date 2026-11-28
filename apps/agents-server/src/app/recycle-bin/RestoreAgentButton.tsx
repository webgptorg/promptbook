'use client';

import { RefreshCcwIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { showAlert } from '@/src/components/AsyncDialogs/asyncDialogs';
import { useAgentNaming } from '@/src/components/AgentNaming/AgentNamingContext';
import { restoreDeletedAgent } from './actions';

/**
 * Props for RestoreAgentButton.
 */
type RestoreAgentButtonProps = {
    agentName: string;
};

/**
 * Restores a deleted agent entry from the recycle bin.
 *
 * @param props - Component props.
 * @returns Restore button element.
 */
export function RestoreAgentButton({ agentName }: RestoreAgentButtonProps) {
    const router = useRouter();
    const [isRestoring, setIsRestoring] = useState(false);
    const { formatText } = useAgentNaming();

    const handleRestore = async () => {
        try {
            setIsRestoring(true);
            await restoreDeletedAgent(agentName);
            router.refresh();
        } catch (error) {
            console.error('Failed to restore agent:', error);
            await showAlert({
                title: 'Restore failed',
                message: formatText('Failed to restore agent'),
            }).catch(() => undefined);
        } finally {
            setIsRestoring(false);
        }
    };

    return (
        <button
            onClick={handleRestore}
            disabled={isRestoring}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-700 disabled:opacity-50"
            title={formatText('Restore agent')}
        >
            <RefreshCcwIcon className={`w-4 h-4 ${isRestoring ? 'animate-spin' : ''}`} />
            {isRestoring ? 'Restoring...' : 'Restore'}
        </button>
    );
}
