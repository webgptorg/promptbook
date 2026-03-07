'use client';

import { RefreshCcwIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { showAlert, showConfirm } from '../../../../components/AsyncDialogs/asyncDialogs';
import { restoreAgentVersion } from './actions';

/**
 * Props for restoring one history entry.
 */
type RestoreVersionButtonProps = {
    readonly agentName: string;
    readonly historyId: number;
    readonly label?: string;
    readonly className?: string;
};

/**
 * Executes restore action for one history item.
 */
export function RestoreVersionButton({ agentName, historyId, label = 'Restore', className }: RestoreVersionButtonProps) {
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
            className={`flex items-center gap-2 rounded border px-3 py-1 text-sm text-gray-700 transition disabled:opacity-50 ${
                className || 'border-gray-300 bg-white hover:bg-gray-50'
            }`}
            title="Restore this version"
        >
            <RefreshCcwIcon className={`w-3 h-3 ${isRestoring ? 'animate-spin' : ''}`} />
            {isRestoring ? 'Restoring...' : label}
        </button>
    );
}
