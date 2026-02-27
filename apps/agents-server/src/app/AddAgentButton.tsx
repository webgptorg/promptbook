'use client';

import { useRouter } from 'next/navigation';
import { FileCard } from '../components/Homepage/FileCard';
import { useAgentNaming } from '../components/AgentNaming/AgentNamingContext';
import { showAlert } from '../components/AsyncDialogs/asyncDialogs';
import { useNewAgentDialog } from '../components/NewAgentDialog/useNewAgentDialog';
import { useServerLanguage } from '../components/ServerLanguage/ServerLanguageProvider';

/**
 * Props for the AddAgentButton component.
 */
type AddAgentButtonProps = {
    /**
     * Folder identifier for the current list view, or null for the root.
     */
    readonly currentFolderId: number | null;
};

/**
 * Renders the add-agent card and creation dialog workflow.
 */
export function AddAgentButton({ currentFolderId }: AddAgentButtonProps) {
    const router = useRouter();
    const { formatText } = useAgentNaming();
    const { t } = useServerLanguage();
    const addButtonLabel = formatText(t('agentCreation.addButtonLabel'));

    const { isPreparingDialog, openNewAgentDialog, dialog } = useNewAgentDialog({
        onCreated: ({ permanentId }) => {
            router.push(`/agents/${permanentId}`);
        },
        onCreateFailed: async (error) => {
            console.error('Failed to create agent:', error);
            await showAlert({
                title: t('agentCreation.createFailedTitle'),
                message: error instanceof Error ? error.message : t('agentCreation.createFailedMessage'),
            }).catch(() => undefined);
        },
        onPrepareFailed: async (error) => {
            console.error('Failed to generate agent boilerplate', error);
            await showAlert({
                title: t('agentCreation.createFailedTitle'),
                message: error instanceof Error ? error.message : t('agentCreation.createFailedMessage'),
            }).catch(() => undefined);
        },
    });

    return (
        <>
            <div
                onClick={isPreparingDialog ? undefined : () => void openNewAgentDialog({ folderId: currentFolderId })}
                className={`cursor-pointer h-full group ${isPreparingDialog ? 'pointer-events-none' : ''}`}
            >
                <FileCard className="flex items-center justify-center text-sm font-medium text-gray-500 group-hover:text-blue-500 group-hover:border-blue-400 border-dashed border-2 border-gray-300">
                    {isPreparingDialog ? (
                        <>
                            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                            {t('agentCreation.preparing')}
                        </>
                    ) : (
                        addButtonLabel
                    )}
                </FileCard>
            </div>

            {dialog}
        </>
    );
}
