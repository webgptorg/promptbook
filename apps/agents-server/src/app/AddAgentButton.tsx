'use client';

import { string_book } from '@promptbook-local/types';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { forTime } from 'waitasecond';
import { FileCard } from '../components/Homepage/FileCard';
import { NewAgentDialog } from '../components/NewAgentDialog/NewAgentDialog';
import { $createAgentFromBookAction, $generateAgentBoilerplateAction } from './actions';

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
    const [isLoading, setIsLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [agentSource, setAgentSource] = useState<string_book>('' as string_book);

    /**
     * Loads boilerplate content and opens the creation dialog.
     */
    const handleAddAgent = async () => {
        setIsLoading(true);
        try {
            const boilerplate = await $generateAgentBoilerplateAction();
            console.log({ boilerplate });
            setAgentSource(boilerplate);

            await forTime(100); // <- Allow some time for `setAgentSource` to propagate
            setIsDialogOpen(true);
        } catch (error) {
            console.error('Failed to generate agent boilerplate', error);
            // TODO: Add proper error handling and UI feedback
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Creates a new agent and navigates to its profile.
     *
     * @param source - Agent source to create.
     */
    const handleCreate = async (source: string_book) => {
        // Note: [🧠] Logic for creation is now handled inside the dialog (waiting for promise), here we just handle navigation
        const { permanentId } = await $createAgentFromBookAction(source, currentFolderId ?? undefined);

        if (permanentId) {
            router.push(`/agents/${permanentId}`);
        } else {
            router.refresh();
        }
    };

    return (
        <>
            <div
                onClick={isLoading ? undefined : handleAddAgent}
                className={`cursor-pointer h-full group ${isLoading ? 'pointer-events-none' : ''}`}
            >
                <FileCard className="flex items-center justify-center text-sm font-medium text-gray-500 group-hover:text-blue-500 group-hover:border-blue-400 border-dashed border-2 border-gray-300">
                    {isLoading ? (
                        <>
                            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                            Preparing...
                        </>
                    ) : (
                        '+ Add New Agent'
                    )}
                </Card>
            </div>

            {isDialogOpen && (
                <NewAgentDialog
                    onClose={() => setIsDialogOpen(false)}
                    initialAgentSource={agentSource}
                    onCreate={handleCreate}
                />
            )}
        </>
    );
}
