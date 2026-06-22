'use client';

import type { string_book } from '@promptbook-local/types';
import type { ReactElement } from 'react';
import { useCallback, useState } from 'react';
import { appendHeadlessParam, useIsHeadless } from '../_utils/headlessParam';
import type { AgentVisibility } from '../../utils/agentVisibility';
import { buildFreshAgentChatHref } from '../../utils/agentRouting/agentRouteHrefs';
import {
    $createAgentFromBookAction,
    $generateAgentBoilerplateAction,
    $getNewAgentCreationSettingsAction,
} from '../../app/actions';
import type { NewAgentWizardMode } from '../../constants/newAgentWizard';
import { NewAgentDialog } from './NewAgentDialog';
import type {
    NewAgentWizardCreateRequest,
    NewAgentWizardOpenEditorRequest,
} from './NewAgentWizard';
import { NewAgentWizard } from './NewAgentWizard';
import { trackNewAgentCreationEvent } from './trackNewAgentCreationEvent';

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
    /**
     * Route that should be opened after creation.
     */
    readonly targetPath: string;
};

/**
 * Configuration for the reusable new-agent dialog controller.
 */
type UseNewAgentDialogOptions = {
    /**
     * Optional callback invoked after the new agent payload is prepared and before navigation starts.
     */
    readonly onCreated?: (agent: CreatedAgentPayload) => Promise<void> | void;
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
 * Local union describing the active new-agent creation surface.
 */
type NewAgentDialogState =
    | {
          readonly surface: 'editor';
          readonly mode: NewAgentWizardMode;
          readonly initialAgentSource: string_book;
          readonly targetFolderId: number | null | undefined;
          readonly visibilityOverride?: AgentVisibility;
      }
    | {
          readonly surface: 'wizard';
          readonly mode: NewAgentWizardMode;
          readonly defaultVisibility: AgentVisibility;
          readonly initialAgentName?: string;
          readonly targetFolderId: number | null | undefined;
      };

/**
 * Extracts the generated display name from boilerplate source.
 *
 * @param boilerplate - Generated boilerplate source.
 * @returns First non-empty line or empty fallback.
 */
function extractAgentNameFromBoilerplate(boilerplate: string_book): string {
    return (
        boilerplate
            .split(/\r?\n/)
            .map((line) => line.trim())
            .find(Boolean) || ''
    );
}

/**
 * Creates the navigation payload returned after one agent is persisted.
 *
 * @param agentName - Persisted display name of the agent.
 * @param permanentId - Canonical immutable identifier of the agent.
 * @returns Shared created-agent payload used by all creation surfaces.
 */
function createCreatedAgentPayload(agentName: string, permanentId: string): CreatedAgentPayload {
    return {
        agentName,
        permanentId,
        targetPath: buildFreshAgentChatHref(permanentId),
    };
}

/**
 * Provides a shared "create new agent" workflow with boilerplate loading and a book-editing dialog.
 */
export function useNewAgentDialog(options: UseNewAgentDialogOptions): UseNewAgentDialogResult {
    const { onCreated, onCreateFailed, onPrepareFailed } = options;
    const isHeadless = useIsHeadless();
    const [isPreparingDialog, setIsPreparingDialog] = useState(false);
    const [dialogState, setDialogState] = useState<NewAgentDialogState | null>(null);

    const closeNewAgentDialog = useCallback(() => {
        setDialogState(null);
    }, []);

    /**
     * Finalizes one successful creation by hard-navigating to the new chat route.
     *
     * The App Router can transiently keep the just-created dynamic route in a stale not-found
     * state, so new-agent creation intentionally uses a full navigation once the route is ready.
     */
    const handleCreatedAgent = useCallback(
        async (agent: CreatedAgentPayload) => {
            await onCreated?.(agent);
            setDialogState(null);
            window.location.assign(appendHeadlessParam(agent.targetPath, isHeadless));
        },
        [isHeadless, onCreated],
    );

    const openNewAgentDialog = useCallback(
        async (openOptions?: OpenNewAgentDialogOptions) => {
            setIsPreparingDialog(true);
            try {
                const settings = await $getNewAgentCreationSettingsAction();

                trackNewAgentCreationEvent('new_agent_flow_assigned', {
                    mode: settings.mode,
                    folderId: openOptions?.folderId,
                });

                if (settings.mode === 'WIZARD') {
                    let initialAgentName = '';
                    try {
                        const boilerplate = await $generateAgentBoilerplateAction();
                        initialAgentName = extractAgentNameFromBoilerplate(boilerplate);
                    } catch {
                        // Keep wizard opening even when boilerplate name prefill is unavailable.
                    }

                    setDialogState({
                        surface: 'wizard',
                        mode: settings.mode,
                        defaultVisibility: settings.defaultVisibility,
                        initialAgentName,
                        targetFolderId: openOptions?.folderId,
                    });
                    trackNewAgentCreationEvent('new_agent_wizard_shown', {
                        mode: settings.mode,
                        surface: 'wizard',
                        folderId: openOptions?.folderId,
                    });
                    return;
                }

                const boilerplate = await $generateAgentBoilerplateAction();
                setDialogState({
                    surface: 'editor',
                    mode: settings.mode,
                    initialAgentSource: boilerplate,
                    targetFolderId: openOptions?.folderId,
                });
            } catch (error) {
                await onPrepareFailed?.(error);
            } finally {
                setIsPreparingDialog(false);
            }
        },
        [onPrepareFailed],
    );

    const handleCreateFromEditor = useCallback(
        async (agentSource: string_book) => {
            if (!dialogState || dialogState.surface !== 'editor') {
                return;
            }

            try {
                const { agentName, permanentId } = await $createAgentFromBookAction(
                    agentSource,
                    dialogState.targetFolderId,
                    dialogState.visibilityOverride,
                );
                trackNewAgentCreationEvent('new_agent_created', {
                    mode: dialogState.mode,
                    surface: 'editor',
                    folderId: dialogState.targetFolderId,
                });
                await handleCreatedAgent(createCreatedAgentPayload(agentName, permanentId));
            } catch (error) {
                await onCreateFailed?.(error);
            }
        },
        [dialogState, handleCreatedAgent, onCreateFailed],
    );

    const handleCreateFromWizard = useCallback(
        async (request: NewAgentWizardCreateRequest) => {
            if (!dialogState || dialogState.surface !== 'wizard') {
                return;
            }

            try {
                const { agentName, permanentId } = await $createAgentFromBookAction(
                    request.agentSource,
                    dialogState.targetFolderId,
                    request.visibility,
                );
                trackNewAgentCreationEvent('new_agent_created', {
                    mode: dialogState.mode,
                    surface: 'wizard',
                    folderId: dialogState.targetFolderId,
                    knowledgeCount: request.knowledgeCount,
                });

                await handleCreatedAgent(createCreatedAgentPayload(agentName, permanentId));
            } catch (error) {
                await onCreateFailed?.(error);
            }
        },
        [dialogState, handleCreatedAgent, onCreateFailed],
    );

    const handleOpenEditorFromWizard = useCallback((request: NewAgentWizardOpenEditorRequest) => {
        setDialogState((currentDialogState) => {
            if (!currentDialogState || currentDialogState.surface !== 'wizard') {
                return currentDialogState;
            }

            return {
                surface: 'editor',
                mode: currentDialogState.mode,
                initialAgentSource: request.agentSource,
                targetFolderId: currentDialogState.targetFolderId,
                visibilityOverride: request.visibility,
            };
        });
    }, []);

    return {
        isPreparingDialog,
        openNewAgentDialog,
        closeNewAgentDialog,
        dialog:
            dialogState?.surface === 'editor' ? (
                <NewAgentDialog
                    onClose={closeNewAgentDialog}
                    initialAgentSource={dialogState.initialAgentSource}
                    onCreate={handleCreateFromEditor}
                />
            ) : dialogState?.surface === 'wizard' ? (
                <NewAgentWizard
                    mode={dialogState.mode}
                    defaultVisibility={dialogState.defaultVisibility}
                    initialAgentName={dialogState.initialAgentName}
                    folderId={dialogState.targetFolderId}
                    onClose={closeNewAgentDialog}
                    onCreate={handleCreateFromWizard}
                    onOpenEditor={handleOpenEditorFromWizard}
                />
            ) : null,
    };
}
