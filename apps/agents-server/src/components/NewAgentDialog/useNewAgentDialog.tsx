'use client';

import type { string_book } from '@promptbook-local/types';
import type { ReactElement } from 'react';
import { useCallback, useState } from 'react';
import { $createAgentFromBookAction, $generateAgentBoilerplateAction } from '../../app/actions';
import { NewAgentDialog } from './NewAgentDialog';

/**
 * Options for opening the new-agent dialog.
 */
type OpenNewAgentDialogOptions = {
    /**
     * Optional folder id where the new agent should be created.
     */
    readonly folderId?: number | null;
};

/**
 * Payload returned after creating a new agent.
 */
type CreatedAgentPayload = {
    /**
     * Created agent name.
     */
    readonly agentName: string;
    /**
     * Created permanent identifier.
     */
    readonly permanentId: string;
};

/**
 * Configuration for the reusable new-agent dialog controller.
 */
type UseNewAgentDialogOptions = {
    /**
     * Called after a new agent is created successfully.
     */
    readonly onCreated: (agent: CreatedAgentPayload) => Promise<void> | void;
    /**
     * Optional callback invoked when creating an agent fails.
     */
    readonly onCreateFailed?: (error: unknown) => Promise<void> | void;
    /**
     * Optional callback invoked when generating boilerplate fails.
     */
    readonly onPrepareFailed?: (error: unknown) => Promise<void> | void;
};

/**
 * Returned controls from the reusable new-agent dialog controller.
 */
type UseNewAgentDialogResult = {
    /**
     * Indicates boilerplate is being prepared before opening the dialog.
     */
    readonly isPreparingDialog: boolean;
    /**
     * Opens the new-agent dialog and optionally binds it to a folder.
     */
    readonly openNewAgentDialog: (options?: OpenNewAgentDialogOptions) => Promise<void>;
    /**
     * Closes the dialog if it is currently open.
     */
    readonly closeNewAgentDialog: () => void;
    /**
     * Renderable dialog node.
     */
    readonly dialog: ReactElement | null;
};

/**
 * Provides a shared "create new agent" workflow with boilerplate loading and a book-editing dialog.
 */
export function useNewAgentDialog(options: UseNewAgentDialogOptions): UseNewAgentDialogResult {
    const { onCreated, onCreateFailed, onPrepareFailed } = options;
    const [isPreparingDialog, setIsPreparingDialog] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [initialAgentSource, setInitialAgentSource] = useState<string_book>('' as string_book);
    const [targetFolderId, setTargetFolderId] = useState<number | null | undefined>(undefined);

    const closeNewAgentDialog = useCallback(() => {
        setIsDialogOpen(false);
    }, []);

    const openNewAgentDialog = useCallback(
        async (openOptions?: OpenNewAgentDialogOptions) => {
            setIsPreparingDialog(true);
            try {
                const boilerplate = await $generateAgentBoilerplateAction();
                setInitialAgentSource(boilerplate);
                setTargetFolderId(openOptions?.folderId);
                setIsDialogOpen(true);
            } catch (error) {
                await onPrepareFailed?.(error);
            } finally {
                setIsPreparingDialog(false);
            }
        },
        [onPrepareFailed],
    );

    const handleCreate = useCallback(
        async (agentSource: string_book) => {
            try {
                const { agentName, permanentId } = await $createAgentFromBookAction(agentSource, targetFolderId);
                await onCreated({ agentName, permanentId });
                setIsDialogOpen(false);
            } catch (error) {
                await onCreateFailed?.(error);
            }
        },
        [onCreateFailed, onCreated, targetFolderId],
    );

    return {
        isPreparingDialog,
        openNewAgentDialog,
        closeNewAgentDialog,
        dialog: isDialogOpen ? (
            <NewAgentDialog
                onClose={closeNewAgentDialog}
                initialAgentSource={initialAgentSource}
                onCreate={handleCreate}
            />
        ) : null,
    };
}
