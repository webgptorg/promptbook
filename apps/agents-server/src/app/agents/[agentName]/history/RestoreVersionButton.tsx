'use client';

import { RefreshCcwIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { showAlert, showConfirm } from '../../../../components/AsyncDialogs/asyncDialogs';
import { restoreAgentVersion } from './actions';

type RestoreVersionButtonProps = {
    agentName: string;
    historyId: number;
};

export function RestoreVersionButton({ agentName, historyId }: RestoreVersionButtonProps) {
    const router = useRouter();
    const [isRestoring, setIsRestoring] = useState(false);

    const handleRestore = async () => {
        const confirmed = await showConfirm({
            title: 'Restore version',
            message: 'Are you sure you want to restore this version? Current changes will be saved to history.',
            confirmLabel: 'Restore version',
            cancelLabel: 'Cancel',
        }).catch(() => false);
        if (!confirmed) {
            return;
        }

        try {
            setIsRestoring(true);
            await restoreAgentVersion(agentName, historyId);
            router.refresh();
            router.push(`/agents/${agentName}`);
        } catch (error) {
            console.error('Failed to restore version:', error);
            await showAlert({
                title: 'Restore failed',
                message: 'Failed to restore version',
            }).catch(() => undefined);
        } finally {
            setIsRestoring(false);
        }
    };

    return (
        <button
            onClick={handleRestore}
            disabled={isRestoring}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-700 disabled:opacity-50"
            title="Restore this version"
        >
            <RefreshCcwIcon className={`w-3 h-3 ${isRestoring ? 'animate-spin' : ''}`} />
            {isRestoring ? 'Restoring...' : 'Restore'}
        </button>
    );
}
