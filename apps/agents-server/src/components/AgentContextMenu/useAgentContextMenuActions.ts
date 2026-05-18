'use client';

import type { AgentBasicInformation } from '@promptbook-local/types';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { getAgentLinks } from '../../app/agents/[agentName]/agentLinks';
import { deleteAgent } from '../../app/recycle-bin/actions';
import { DEFAULT_AGENT_VISIBILITY, type AgentVisibility } from '../../utils/agentVisibility';
import { promptCloneAgent } from '../AgentCloning/cloneAgent';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import { showAlert, showConfirm, showPrompt, showVisibilityDialog } from '../AsyncDialogs/asyncDialogs';
import type { AgentContextMenuBaseProps } from './AgentContextMenu';

/**
 * Keeps the legacy update-URL action disabled without changing current behavior.
 *
 * @private function of useAgentContextMenuItems
 */
const IS_UPDATE_URL_ACTION_ENABLED = false;

/**
 * Text formatter returned by the naming context.
 *
 * @private function of useAgentContextMenuItems
 */
type FormatAgentContextMenuText = ReturnType<typeof useAgentNaming>['formatText'];

/**
 * Agent-specific navigation link used by the menu.
 *
 * @private function of useAgentContextMenuItems
 */
type AgentContextMenuLink = ReturnType<typeof getAgentLinks>[number];

/**
 * Structured state shared across the menu action helpers.
 *
 * @private function of useAgentContextMenuItems
 */
type AgentContextMenuActionContext = {
    readonly agent: AgentContextMenuBaseProps['agent'];
    readonly agentIdentifier: string;
    readonly agentName: string;
    readonly derivedAgentName: string;
    readonly displayName: string;
    readonly formatText: FormatAgentContextMenuText;
    readonly onAgentRenamed?: AgentContextMenuBaseProps['onAgentRenamed'];
    readonly onRequestClose?: AgentContextMenuBaseProps['onRequestClose'];
};

/**
 * Derived navigation links and flags used by the menu action hook.
 *
 * @private function of useAgentContextMenuItems
 */
type AgentContextMenuLinkState = {
    readonly editBookLink: AgentContextMenuLink;
    readonly integrationLink: AgentContextMenuLink;
    readonly isUpdateUrlActionVisible: boolean;
    readonly updateUrlHref: string;
    readonly usageAnalyticsHref: string;
};

/**
 * Async handlers and derived values used when building the menu sections.
 *
 * @private function of useAgentContextMenuItems
 */
type UseAgentContextMenuActionsResult = {
    readonly editBookLink: AgentContextMenuLink;
    readonly handleCloneAgent: () => Promise<void>;
    readonly handleDeleteAgent: () => Promise<void>;
    readonly handleRenameAgent: () => Promise<void>;
    readonly handleRequestVisibilityUpdate: () => Promise<void>;
    readonly handleUpdateUrl: () => Promise<void>;
    readonly integrationLink: AgentContextMenuLink;
    readonly isUpdateUrlActionVisible: boolean;
    readonly shouldShowVisibilityAction: boolean;
    readonly usageAnalyticsHref: string;
};

/**
 * API response returned after a successful or failed rename request.
 *
 * @private function of useAgentContextMenuItems
 */
type RenameAgentResponse = {
    readonly success: boolean;
    readonly agent?: AgentBasicInformation;
    readonly error?: string;
};

/**
 * API response returned after a visibility update request.
 *
 * @private function of useAgentContextMenuItems
 */
type UpdateAgentVisibilityResponse = {
    readonly success: boolean;
    readonly error?: string;
};

/**
 * Result returned by the visibility-specific action hook.
 *
 * @private function of useAgentContextMenuItems
 */
type UseAgentContextMenuVisibilityActionsResult = {
    readonly handleRequestVisibilityUpdate: () => Promise<void>;
    readonly shouldShowVisibilityAction: boolean;
};

/**
 * Finds one required agent link by id.
 *
 * @param links - Available generated links.
 * @param id - Link identifier to resolve.
 * @returns Matching link metadata.
 *
 * @private function of useAgentContextMenuItems
 */
function findAgentLink(
    links: ReadonlyArray<AgentContextMenuLink>,
    id: NonNullable<AgentContextMenuLink['id']>,
): AgentContextMenuLink {
    return links.find((link) => link.id === id)!;
}

/**
 * Builds the admin usage-analytics URL for the current agent filter.
 *
 * @param usageFilterAgentName - Agent name used in the analytics filter.
 * @returns Admin usage-analytics URL.
 *
 * @private function of useAgentContextMenuItems
 */
function createUsageAnalyticsHref(usageFilterAgentName: string): string {
    const searchParams = new URLSearchParams();

    if (usageFilterAgentName) {
        searchParams.set('agentName', usageFilterAgentName);
    }

    searchParams.set('timeframe', '30d');
    const query = searchParams.toString();

    return query ? `/admin/usage?${query}` : '/admin/usage';
}

/**
 * Shows a best-effort alert dialog for menu actions.
 *
 * @param title - Dialog title.
 * @param message - Dialog body.
 * @returns Promise that resolves after the dialog is handled.
 *
 * @private function of useAgentContextMenuItems
 */
async function showAgentContextMenuAlert(title: string, message: string): Promise<void> {
    await showAlert({ title, message }).catch(() => undefined);
}

/**
 * Extracts a user-facing error message from an unknown thrown value.
 *
 * @param error - Caught error value.
 * @param fallbackMessage - Message used when the error is not an `Error`.
 * @returns Message safe to display in a dialog.
 *
 * @private function of useAgentContextMenuItems
 */
function resolveAgentContextMenuErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof Error ? error.message : fallbackMessage;
}

/**
 * Normalizes the prop bundle used across menu actions.
 *
 * @param props - Shared agent menu props.
 * @param formatText - Agent-aware text formatter.
 * @returns Stable derived identifiers and callbacks for menu actions.
 *
 * @private function of useAgentContextMenuItems
 */
function createAgentContextMenuActionContext(
    props: AgentContextMenuBaseProps,
    formatText: FormatAgentContextMenuText,
): AgentContextMenuActionContext {
    const { agent, agentName, derivedAgentName, permanentId, onAgentRenamed, onRequestClose } = props;

    return {
        agent,
        agentIdentifier: permanentId || agentName,
        agentName,
        derivedAgentName,
        displayName: derivedAgentName || agentName,
        formatText,
        onAgentRenamed,
        onRequestClose,
    };
}

/**
 * Resolves the generated links and visibility flags used by the menu actions.
 *
 * @param actionContext - Shared action context.
 * @returns Derived links, URLs, and legacy action visibility flags.
 *
 * @private function of useAgentContextMenuItems
 */
function useAgentContextMenuLinkState(actionContext: AgentContextMenuActionContext): AgentContextMenuLinkState {
    const { agentIdentifier, agentName, derivedAgentName, displayName, formatText } = actionContext;
    const links = useMemo(() => getAgentLinks(agentIdentifier, formatText), [agentIdentifier, formatText]);

    return useMemo(
        () => ({
            editBookLink: findAgentLink(links, 'book'),
            integrationLink: findAgentLink(links, 'integration'),
            isUpdateUrlActionVisible: IS_UPDATE_URL_ACTION_ENABLED && agentName !== derivedAgentName,
            updateUrlHref: `/agents/${encodeURIComponent(derivedAgentName)}`,
            usageAnalyticsHref: createUsageAnalyticsHref(displayName),
        }),
        [agentName, derivedAgentName, displayName, links],
    );
}

/**
 * Asks the user to confirm the legacy URL-update redirect.
 *
 * @param agentName - Current routed agent name.
 * @param derivedAgentName - Agent name derived from the current source.
 * @param formatText - Agent-aware text formatter.
 * @returns Whether the redirect was confirmed.
 *
 * @private function of useAgentContextMenuItems
 */
async function confirmUpdateUrl(
    agentName: string,
    derivedAgentName: string,
    formatText: FormatAgentContextMenuText,
): Promise<boolean> {
    return showConfirm({
        title: formatText('Update agent URL'),
        message: `${formatText('Are you sure you want to change the agent URL from')} "/agents/${agentName}" to "/agents/${derivedAgentName}"?`,
        confirmLabel: formatText('Update URL'),
        cancelLabel: formatText('Cancel'),
    }).catch(() => false);
}

/**
 * Creates the legacy URL-update action handler.
 *
 * @param actionContext - Shared action context.
 * @param updateUrlHref - Redirect target used by the legacy action.
 * @returns Stable update-URL handler.
 *
 * @private function of useAgentContextMenuItems
 */
function useAgentContextMenuUpdateUrlAction(
    actionContext: AgentContextMenuActionContext,
    updateUrlHref: string,
): () => Promise<void> {
    const { agentName, derivedAgentName, formatText } = actionContext;

    return useCallback(async () => {
        const isConfirmed = await confirmUpdateUrl(agentName, derivedAgentName, formatText);

        if (isConfirmed) {
            window.location.href = updateUrlHref;
        }
    }, [agentName, derivedAgentName, formatText, updateUrlHref]);
}

/**
 * Asks the user to confirm agent deletion.
 *
 * @param displayName - Name shown in the confirmation dialog.
 * @param formatText - Agent-aware text formatter.
 * @returns Whether the delete action was confirmed.
 *
 * @private function of useAgentContextMenuItems
 */
async function confirmDeleteAgent(
    displayName: string,
    formatText: FormatAgentContextMenuText,
): Promise<boolean> {
    return showConfirm({
        title: formatText('Delete agent'),
        message: `${formatText('Are you sure you want to delete the agent')} "${displayName}"? ${formatText('This action can be undone by restoring it from the recycle bin.')}`,
        confirmLabel: formatText('Delete agent'),
        cancelLabel: formatText('Cancel'),
    }).catch(() => false);
}

/**
 * Creates the destructive delete handler for the menu.
 *
 * @param actionContext - Shared action context.
 * @returns Stable delete handler.
 *
 * @private function of useAgentContextMenuItems
 */
function useAgentContextMenuDeleteAction(actionContext: AgentContextMenuActionContext): () => Promise<void> {
    const { agentIdentifier, displayName, formatText } = actionContext;

    return useCallback(async () => {
        const isConfirmed = await confirmDeleteAgent(displayName, formatText);

        if (!isConfirmed) {
            return;
        }

        try {
            await deleteAgent(agentIdentifier);
            window.location.href = '/';
        } catch (error) {
            console.error('Failed to delete agent:', error);
            await showAgentContextMenuAlert(
                formatText('Delete failed'),
                formatText('Failed to delete agent. Please try again.'),
            );
        }
    }, [agentIdentifier, displayName, formatText]);
}

/**
 * Opens the rename dialog for the current agent.
 *
 * @param displayName - Current display name shown as the default value.
 * @param formatText - Agent-aware text formatter.
 * @returns Entered name or `null` when cancelled.
 *
 * @private function of useAgentContextMenuItems
 */
async function promptForAgentRename(
    displayName: string,
    formatText: FormatAgentContextMenuText,
): Promise<string | null> {
    return showPrompt({
        title: formatText('Rename agent'),
        message: formatText('Enter a new name for this agent.'),
        defaultValue: displayName,
        confirmLabel: formatText('Rename'),
        cancelLabel: formatText('Cancel'),
        placeholder: formatText('Agent name'),
        inputLabel: formatText('Agent name'),
    }).catch(() => null);
}

/**
 * Sends the rename request to the server and returns the updated agent.
 *
 * @param agentIdentifier - Identifier used by the rename API.
 * @param name - Validated new agent name.
 * @param formatText - Agent-aware text formatter.
 * @returns Updated agent profile returned by the API.
 *
 * @private function of useAgentContextMenuItems
 */
async function updateAgentName(
    agentIdentifier: string,
    name: string,
    formatText: FormatAgentContextMenuText,
): Promise<AgentBasicInformation> {
    const response = await fetch(`/api/agents/${encodeURIComponent(agentIdentifier)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    });
    const data = (await response.json()) as RenameAgentResponse;

    if (!response.ok || !data.agent) {
        throw new Error(data.error || formatText('Failed to rename agent.'));
    }

    return data.agent;
}

/**
 * Creates the rename handler for the menu.
 *
 * @param actionContext - Shared action context.
 * @returns Stable rename handler.
 *
 * @private function of useAgentContextMenuItems
 */
function useAgentContextMenuRenameAction(actionContext: AgentContextMenuActionContext): () => Promise<void> {
    const { agentIdentifier, displayName, formatText, onAgentRenamed, onRequestClose } = actionContext;

    return useCallback(async () => {
        const name = await promptForAgentRename(displayName, formatText);

        if (!name) {
            return;
        }

        const trimmedName = name.trim();

        if (!trimmedName) {
            await showAgentContextMenuAlert(
                formatText('Invalid name'),
                formatText('Agent name cannot be empty.'),
            );
            return;
        }

        try {
            const renamedAgent = await updateAgentName(agentIdentifier, trimmedName, formatText);
            onAgentRenamed?.({ agent: renamedAgent, previousIdentifier: agentIdentifier });
            onRequestClose?.();
        } catch (error) {
            await showAgentContextMenuAlert(
                formatText('Rename failed'),
                resolveAgentContextMenuErrorMessage(error, formatText('Failed to rename agent.')),
            );
        }
    }, [agentIdentifier, displayName, formatText, onAgentRenamed, onRequestClose]);
}

/**
 * Creates the clone-and-navigate action handler.
 *
 * @param actionContext - Shared action context.
 * @returns Stable clone handler.
 *
 * @private function of useAgentContextMenuItems
 */
function useAgentContextMenuCloneAction(actionContext: AgentContextMenuActionContext): () => Promise<void> {
    const { agentIdentifier, displayName, formatText, onRequestClose } = actionContext;
    const router = useRouter();

    return useCallback(async () => {
        const clonedAgent = await promptCloneAgent({
            agentIdentifier,
            agentName: displayName,
            formatText,
        });

        if (!clonedAgent) {
            return;
        }

        onRequestClose?.();
        router.push(`/agents/${encodeURIComponent(clonedAgent.permanentId || clonedAgent.agentName)}`);
    }, [agentIdentifier, displayName, formatText, onRequestClose, router]);
}

/**
 * Persists a new visibility value for the current agent.
 *
 * @param agentIdentifier - Identifier used by the update API.
 * @param visibility - Visibility chosen in the dialog.
 * @param formatText - Agent-aware text formatter.
 * @returns Promise that resolves once the update succeeds.
 *
 * @private function of useAgentContextMenuItems
 */
async function updateAgentVisibility(
    agentIdentifier: string,
    visibility: AgentVisibility,
    formatText: FormatAgentContextMenuText,
): Promise<void> {
    const response = await fetch(`/api/agents/${encodeURIComponent(agentIdentifier)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility }),
    });
    const data = (await response.json()) as UpdateAgentVisibilityResponse;

    if (!response.ok || !data.success) {
        throw new Error(data.error || formatText('Failed to update agent visibility.'));
    }
}

/**
 * Opens the visibility dialog for the current agent.
 *
 * @param agent - Current agent metadata.
 * @param formatText - Agent-aware text formatter.
 * @returns Selected visibility or `null` when cancelled.
 *
 * @private function of useAgentContextMenuItems
 */
async function promptForVisibilitySelection(
    agent: AgentContextMenuBaseProps['agent'],
    formatText: FormatAgentContextMenuText,
): Promise<AgentVisibility | null> {
    return showVisibilityDialog({
        title: formatText('Update visibility'),
        description: `${formatText('Set visibility for agent')} "${agent.agentName}".`,
        confirmLabel: formatText('Update visibility'),
        initialVisibility: agent.visibility ?? DEFAULT_AGENT_VISIBILITY,
    }).catch(() => null);
}

/**
 * Creates the visibility-specific handlers used by the admin menu section.
 *
 * @param actionContext - Shared action context.
 * @param isAuthenticated - Whether the current user is logged in.
 * @returns Visibility action handler and render flag.
 *
 * @private function of useAgentContextMenuItems
 */
function useAgentContextMenuVisibilityActions(
    actionContext: AgentContextMenuActionContext,
    isAuthenticated: boolean,
): UseAgentContextMenuVisibilityActionsResult {
    const { agent, agentIdentifier, formatText } = actionContext;
    const shouldShowVisibilityAction = Boolean(isAuthenticated && agent.visibility);

    const handleSetVisibility = useCallback(
        async (visibility: AgentVisibility) => {
            try {
                await updateAgentVisibility(agentIdentifier, visibility, formatText);
                window.location.reload();
            } catch (error) {
                await showAgentContextMenuAlert(
                    formatText('Update failed'),
                    resolveAgentContextMenuErrorMessage(error, formatText('Failed to update agent visibility.')),
                );
            }
        },
        [agentIdentifier, formatText],
    );

    const handleRequestVisibilityUpdate = useCallback(async () => {
        const selectedVisibility = await promptForVisibilitySelection(agent, formatText);

        if (!selectedVisibility || selectedVisibility === agent.visibility) {
            return;
        }

        await handleSetVisibility(selectedVisibility);
    }, [agent, formatText, handleSetVisibility]);

    return { handleRequestVisibilityUpdate, shouldShowVisibilityAction };
}

/**
 * Resolves all action handlers and derived link state used by the menu.
 *
 * @param props - Shared agent menu props.
 * @param formatText - Agent-aware text formatter.
 * @returns Derived menu handlers and links.
 *
 * @private function of useAgentContextMenuItems
 */
export function useAgentContextMenuActions(
    props: AgentContextMenuBaseProps,
    formatText: FormatAgentContextMenuText,
): UseAgentContextMenuActionsResult {
    const actionContext = createAgentContextMenuActionContext(props, formatText);
    const { editBookLink, integrationLink, isUpdateUrlActionVisible, updateUrlHref, usageAnalyticsHref } =
        useAgentContextMenuLinkState(actionContext);
    const handleUpdateUrl = useAgentContextMenuUpdateUrlAction(actionContext, updateUrlHref);
    const handleDeleteAgent = useAgentContextMenuDeleteAction(actionContext);
    const handleRenameAgent = useAgentContextMenuRenameAction(actionContext);
    const handleCloneAgent = useAgentContextMenuCloneAction(actionContext);
    const { handleRequestVisibilityUpdate, shouldShowVisibilityAction } = useAgentContextMenuVisibilityActions(
        actionContext,
        props.isAuthenticated ?? props.isAdmin ?? false,
    );

    return {
        editBookLink,
        handleCloneAgent,
        handleDeleteAgent,
        handleRenameAgent,
        handleRequestVisibilityUpdate,
        handleUpdateUrl,
        integrationLink,
        isUpdateUrlActionVisible,
        shouldShowVisibilityAction,
        usageAnalyticsHref,
    };
}
