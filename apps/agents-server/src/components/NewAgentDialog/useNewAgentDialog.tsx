'use client';

import type { string_book } from '@promptbook-local/types';
import type { ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { NotAllowed } from '../../../../../src/errors/NotAllowed';
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
import type { NewAgentWizardCreateRequest } from './NewAgentWizard';
import { NewAgentWizard } from './NewAgentWizard';
import type { NewAgentOpenEditorRequest } from './NewAgentOpenEditorRequest';
import { ManGoNewAgentWizard, type ManGoNewAgentWizardCreateRequest } from './ManGoNewAgentWizard/ManGoNewAgentWizard';
import { trackNewAgentCreationEvent } from './trackNewAgentCreationEvent';
import { createOnboardingSession, type OnboardingSession } from './ManGoNewAgentWizard/state/createOnboardingSession';
import { retireLegacyOnboardingSnapshot } from './ManGoNewAgentWizard/state/retireLegacyOnboardingSnapshot';

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
    /** Host account/server scope; changing it abandons only an active manGo draft or handoff. */
    readonly creationScope?: string;
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
          readonly manGoSession?: OnboardingSession;
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
      }
    | {
          readonly surface: 'mango-wizard';
          readonly session: OnboardingSession;
          readonly mode: NewAgentWizardMode;
          readonly defaultVisibility: AgentVisibility;
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
    const { creationScope, onCreated, onCreateFailed, onPrepareFailed } = options;
    const isHeadless = useIsHeadless();
    const [isPreparingDialog, setIsPreparingDialog] = useState(false);
    const [dialogState, setDialogState] = useState<NewAgentDialogState | null>(null);
    const openingRevisionRef = useRef(0);
    const manGoSessionRef = useRef<OnboardingSession | null>(null);
    const creationScopeRef = useRef(creationScope);
    creationScopeRef.current = creationScope;

    /** Ownership includes the current host scope, independently of the random creation identity. */
    const isCurrentManGoSession = useCallback((session: OnboardingSession) => {
        return manGoSessionRef.current === session && creationScopeRef.current === session.scope;
    }, []);

    // The controller owns exits. Provider/step remounts are not new creation requests.
    useEffect(
        () => () => {
            openingRevisionRef.current += 1;
            manGoSessionRef.current?.end();
            manGoSessionRef.current = null;
        },
        [],
    );

    const closeNewAgentDialog = useCallback(() => {
        openingRevisionRef.current += 1;
        manGoSessionRef.current?.end();
        manGoSessionRef.current = null;
        setIsPreparingDialog(false);
        setDialogState(null);
    }, []);

    useEffect(() => {
        if (manGoSessionRef.current && manGoSessionRef.current.scope !== creationScope) {
            closeNewAgentDialog();
        }
    }, [closeNewAgentDialog, creationScope]);

    /**
     * Finalizes one successful creation by hard-navigating to the new chat route.
     *
     * The App Router can transiently keep the just-created dynamic route in a stale not-found
     * state, so new-agent creation intentionally uses a full navigation once the route is ready.
     */
    const handleCreatedAgent = useCallback(
        async (
            agent: CreatedAgentPayload,
            isCurrent: () => boolean = () => true,
            isNotificationFailureIgnored = false,
        ) => {
            if (!isCurrent()) return;
            try {
                await onCreated?.(agent);
            } catch (error) {
                if (!isNotificationFailureIgnored) throw error;
                console.error('Created manGo agent notification failed:', error);
            }
            if (!isCurrent()) return;
            closeNewAgentDialog();
            window.location.assign(appendHeadlessParam(agent.targetPath, isHeadless));
        },
        [closeNewAgentDialog, isHeadless, onCreated],
    );

    const openNewAgentDialog = useCallback(
        async (openOptions?: OpenNewAgentDialogOptions) => {
            // Every explicit opening replaces the previous lifetime before awaiting host settings.
            closeNewAgentDialog();
            const openingRevision = openingRevisionRef.current;
            setIsPreparingDialog(true);
            try {
                const settings = await $getNewAgentCreationSettingsAction();
                if (openingRevisionRef.current !== openingRevision || creationScopeRef.current !== creationScope)
                    return;

                trackNewAgentCreationEvent('new_agent_flow_assigned', {
                    mode: settings.mode,
                    folderId: openOptions?.folderId,
                });

                if (settings.mode === 'MANGO_WIZARD') {
                    const session = createOnboardingSession(creationScope);
                    manGoSessionRef.current = session;
                    retireLegacyOnboardingSnapshot();
                    setDialogState({
                        session,
                        surface: 'mango-wizard',
                        mode: settings.mode,
                        defaultVisibility: settings.defaultVisibility,
                        targetFolderId: openOptions?.folderId,
                    });
                    trackNewAgentCreationEvent('new_agent_wizard_shown', {
                        mode: settings.mode,
                        surface: 'mango-wizard',
                        folderId: openOptions?.folderId,
                    });
                    return;
                }

                if (settings.mode === 'WIZARD') {
                    let initialAgentName = '';
                    try {
                        const boilerplate = await $generateAgentBoilerplateAction();
                        initialAgentName = extractAgentNameFromBoilerplate(boilerplate);
                    } catch {
                        // Keep wizard opening even when boilerplate name prefill is unavailable.
                    }

                    if (openingRevisionRef.current !== openingRevision) return;
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
                if (openingRevisionRef.current !== openingRevision) return;
                setDialogState({
                    surface: 'editor',
                    mode: settings.mode,
                    initialAgentSource: boilerplate,
                    targetFolderId: openOptions?.folderId,
                });
            } catch (error) {
                if (openingRevisionRef.current === openingRevision && creationScopeRef.current === creationScope) {
                    await onPrepareFailed?.(error);
                }
            } finally {
                if (openingRevisionRef.current === openingRevision) setIsPreparingDialog(false);
            }
        },
        [closeNewAgentDialog, creationScope, onPrepareFailed],
    );

    const handleCreateFromEditor = useCallback(
        async (agentSource: string_book) => {
            if (
                !dialogState ||
                dialogState.surface !== 'editor' ||
                (dialogState.manGoSession && !isCurrentManGoSession(dialogState.manGoSession))
            ) {
                return;
            }
            const session = dialogState.manGoSession;
            const isCurrent = () => !session || (isCurrentManGoSession(session) && session.isActive());
            if (!isCurrent()) return;
            const savedTargetPath = session?.getState().savedAgentTargetPath;
            if (savedTargetPath) {
                closeNewAgentDialog();
                window.location.assign(appendHeadlessParam(savedTargetPath, isHeadless));
                return;
            }
            if (session?.isOperationPending('creation')) return;
            const operation = session?.beginOperation('creation');
            if (session && !operation) return;
            try {
                const { agentName, permanentId } = await $createAgentFromBookAction(
                    agentSource,
                    dialogState.targetFolderId,
                    dialogState.visibilityOverride,
                );
                const createdAgent = createCreatedAgentPayload(agentName, permanentId);
                session?.complete({ permanentId, targetPath: createdAgent.targetPath });
                trackNewAgentCreationEvent('new_agent_created', {
                    mode: dialogState.mode,
                    surface: 'editor',
                    folderId: dialogState.targetFolderId,
                });
                await handleCreatedAgent(createdAgent, isCurrent, Boolean(session));
            } catch (error) {
                if (isCurrent()) await onCreateFailed?.(error);
            } finally {
                operation?.finish();
            }
        },
        [closeNewAgentDialog, dialogState, handleCreatedAgent, isCurrentManGoSession, isHeadless, onCreateFailed],
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

    const handleCreateFromManGoWizard = useCallback(
        async (request: ManGoNewAgentWizardCreateRequest) => {
            if (
                !dialogState ||
                dialogState.surface !== 'mango-wizard' ||
                !isCurrentManGoSession(dialogState.session) ||
                !dialogState.session.isActive()
            ) {
                throw new NotAllowed('The manGo creation session is no longer open.');
            }
            const session = dialogState.session;
            const isCurrent = () => isCurrentManGoSession(session) && session.isActive();
            let persistedAgent: Awaited<ReturnType<typeof $createAgentFromBookAction>>;
            try {
                persistedAgent = await $createAgentFromBookAction(
                    request.agentSource,
                    dialogState.targetFolderId,
                    request.visibility,
                );
            } catch (error) {
                if (isCurrent()) await onCreateFailed?.(error);
                throw error;
            }
            const createdAgent = createCreatedAgentPayload(persistedAgent.agentName, persistedAgent.permanentId);
            const result = { permanentId: persistedAgent.permanentId, targetPath: createdAgent.targetPath };
            // A cancellation cannot undo a server save. Record success on its original draft first,
            // and never turn a notification failure into a retry of an already created agent.
            session.complete(result);
            trackNewAgentCreationEvent('new_agent_created', {
                mode: dialogState.mode,
                surface: 'mango-wizard',
                folderId: dialogState.targetFolderId,
                knowledgeCount: request.knowledgeCount,
            });
            if (isCurrent()) {
                try {
                    await onCreated?.(createdAgent);
                } catch (error) {
                    console.error('Created manGo agent notification failed:', error);
                }
            }
            return result;
        },
        [dialogState, isCurrentManGoSession, onCreateFailed, onCreated],
    );

    const handleCloseManGoWizard = useCallback(() => {
        if (dialogState?.surface === 'mango-wizard' && isCurrentManGoSession(dialogState.session)) {
            closeNewAgentDialog();
        }
    }, [closeNewAgentDialog, dialogState, isCurrentManGoSession]);

    /** A delayed dirty-editor close confirmation belongs only to the original handoff. */
    const handleCloseEditor = useCallback(() => {
        if (dialogState?.surface !== 'editor') return;
        if (dialogState.manGoSession && !isCurrentManGoSession(dialogState.manGoSession)) return;
        closeNewAgentDialog();
    }, [closeNewAgentDialog, dialogState, isCurrentManGoSession]);

    const handleRestartManGoWizard = useCallback(() => {
        if (dialogState?.surface !== 'mango-wizard' || !isCurrentManGoSession(dialogState.session)) return;
        dialogState.session.end();
        const session = createOnboardingSession(creationScope);
        manGoSessionRef.current = session;
        // Folder, visibility and flow assignment are host configuration, not draft content.
        setDialogState({ ...dialogState, session });
    }, [creationScope, dialogState, isCurrentManGoSession]);

    const handleOpenCreatedManGoAgent = useCallback(
        (targetPath: string) => {
            if (
                dialogState?.surface !== 'mango-wizard' ||
                !isCurrentManGoSession(dialogState.session) ||
                targetPath !== dialogState.session.getState().savedAgentTargetPath
            )
                return;
            closeNewAgentDialog();
            window.location.assign(appendHeadlessParam(targetPath, isHeadless));
        },
        [closeNewAgentDialog, dialogState, isCurrentManGoSession, isHeadless],
    );

    const handleOpenEditorFromGuidedSurface = useCallback(
        (request: NewAgentOpenEditorRequest) => {
            if (!dialogState || (dialogState.surface !== 'wizard' && dialogState.surface !== 'mango-wizard')) return;
            const session = dialogState.surface === 'mango-wizard' ? dialogState.session : undefined;
            if (session && !isCurrentManGoSession(session)) return;
            session?.handoff();
            setDialogState({
                surface: 'editor',
                mode: dialogState.mode,
                manGoSession: session,
                initialAgentSource: request.agentSource,
                targetFolderId: dialogState.targetFolderId,
                visibilityOverride: request.visibility,
            });
        },
        [dialogState, isCurrentManGoSession],
    );

    return {
        isPreparingDialog,
        openNewAgentDialog,
        closeNewAgentDialog,
        dialog:
            dialogState?.surface === 'editor' &&
            (!dialogState.manGoSession || dialogState.manGoSession.scope === creationScope) ? (
                <NewAgentDialog
                    key={dialogState.manGoSession?.id}
                    onClose={handleCloseEditor}
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
                    onOpenEditor={handleOpenEditorFromGuidedSurface}
                />
            ) : dialogState?.surface === 'mango-wizard' && dialogState.session.scope === creationScope ? (
                <ManGoNewAgentWizard
                    key={dialogState.session.id}
                    session={dialogState.session}
                    onRestart={handleRestartManGoWizard}
                    mode={dialogState.mode}
                    defaultVisibility={dialogState.defaultVisibility}
                    folderId={dialogState.targetFolderId}
                    onClose={handleCloseManGoWizard}
                    onCreate={handleCreateFromManGoWizard}
                    onOpenCreatedAgent={handleOpenCreatedManGoAgent}
                    onOpenEditor={handleOpenEditorFromGuidedSurface}
                />
            ) : null,
    };
}
