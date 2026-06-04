'use client';

import type { ReactElement, ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';
import type { AgentFolderContext } from '../../utils/agentOrganization/agentFolderContext';
import type { AgentOrganizationAgent } from '../../utils/agentOrganization/types';
import type { ServerTranslationKey } from '../../languages/ServerTranslationKeys';
import {
    useAgentContextMenuItems,
    type AgentContextMenuBaseProps,
    type AgentContextMenuRenamePayload,
} from '../AgentContextMenu/AgentContextMenu';
import { showAlert } from '../AsyncDialogs/asyncDialogs';
import { useNewAgentDialog } from '../NewAgentDialog/useNewAgentDialog';
import type { AgentMenuTreeNode } from './AgentMenuStructure';
import { appendFolderActionNodes } from './appendFolderActionNodes';
import { buildActiveAgentViewItems } from './buildActiveAgentViewItems';
import { createAgentHierarchyMobileItems } from './createAgentHierarchyMobileItems';
import { mapContextMenuItemsToSubMenuItems } from './mapContextMenuItemsToSubMenuItems';
import type { SubMenuItem } from './SubMenuItem';

/**
 * Translation function shape used by Header-specific hooks.
 *
 * @private type of Header
 */
type HeaderTranslate = (key: ServerTranslationKey, variables?: Record<string, string>) => string;

/**
 * Inputs required to assemble the agent-specific menus inside the Header.
 *
 * @private type of Header
 */
type UseHeaderAgentMenusOptions = {
    readonly activeAgent: AgentOrganizationAgent | null;
    readonly activeAgentEmail: string;
    readonly activeAgentFolderContext: AgentFolderContext | null;
    readonly activeAgentMenuAgent: AgentOrganizationAgent;
    readonly activeAgentNavigationId: string | null;
    readonly activeAgentUrl: string;
    readonly agentMenuTree: ReadonlyArray<AgentMenuTreeNode>;
    readonly closeAgentViewDropdown: () => void;
    readonly installPromptEvent: AgentContextMenuBaseProps['installPromptEvent'];
    readonly isAdmin: boolean;
    readonly isAuthenticated: boolean;
    readonly isInstalled: boolean;
    readonly namingPlural: string;
    readonly namingSingular: string;
    readonly onAgentRenamed: (payload: AgentContextMenuRenamePayload) => void;
    readonly onInstallApp: AgentContextMenuBaseProps['onInstallApp'];
    readonly setIsAgentsOpen: (isOpen: boolean) => void;
    readonly setIsMenuOpen: (isOpen: boolean) => void;
    readonly translate: HeaderTranslate;
};

/**
 * Derived agent-menu state consumed by the Header component.
 *
 * @private type of Header
 */
type HeaderAgentMenusState = {
    readonly activeAgentViewItems: ReadonlyArray<SubMenuItem>;
    readonly agentMenuTree: ReadonlyArray<AgentMenuTreeNode>;
    readonly createNewAgentLabel: ReactNode;
    readonly handleCloseAgentQrCode: () => void;
    readonly handleCreateAgent: (folderId: number | null) => void;
    readonly hierarchyAgentMobileItems: ReadonlyArray<SubMenuItem>;
    readonly isAgentQrCodeOpen: boolean;
    readonly isPreparingDialog: boolean;
    readonly newAgentDialog: ReactElement | null;
    readonly viewAllAgentsLabel: string;
};

/**
 * Creates the rich "create new agent" label, including the loading spinner while preparing the dialog.
 *
 * @private function of Header
 */
function createNewAgentLabel(
    isPreparingDialog: boolean,
    namingSingular: string,
    translate: HeaderTranslate,
): ReactNode {
    if (!isPreparingDialog) {
        return translate('header.createNewAgent', { agentSingular: namingSingular });
    }

    return (
        <div className="flex items-center">
            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            {translate('header.creatingAgent', { agentSingular: namingSingular })}
        </div>
    );
}

/**
 * Creates the fixed "view all" and "create new" actions appended to the mobile agent hierarchy.
 *
 * @private function of Header
 */
function createHierarchyAgentActionItems(
    viewAllAgentsLabel: string,
    createNewAgentLabelNode: ReactNode,
    isPreparingDialog: boolean,
    handleCreateAgent: (folderId: number | null) => void,
): SubMenuItem[] {
    return [
        {
            label: viewAllAgentsLabel,
            href: '/agents',
            isBold: true,
            isBordered: true,
        },
        {
            label: createNewAgentLabelNode,
            onClick: isPreparingDialog ? undefined : () => handleCreateAgent(null),
            isBold: true,
        },
    ];
}

/**
 * Shows the shared "new agent" failure dialog while preserving the original log context.
 *
 * @private function of Header
 */
async function showNewAgentFailure(
    logMessage: string,
    error: unknown,
    namingSingular: string,
    translate: HeaderTranslate,
): Promise<void> {
    console.error(logMessage, error);

    await showAlert({
        title: translate('header.createFailedTitle', { agentSingular: namingSingular }),
        message:
            error instanceof Error
                ? error.message
                : translate('header.createFailedMessage', { agentSingular: namingSingular }),
    }).catch(() => undefined);
}

/**
 * Assembles agent-specific header menu data, rename handling, and create-agent controls.
 *
 * @private function of Header
 */
export function useHeaderAgentMenus({
    activeAgent,
    activeAgentEmail,
    activeAgentFolderContext,
    activeAgentMenuAgent,
    activeAgentNavigationId,
    activeAgentUrl,
    agentMenuTree,
    closeAgentViewDropdown,
    installPromptEvent,
    isAdmin,
    isAuthenticated,
    isInstalled,
    namingPlural,
    namingSingular,
    onAgentRenamed,
    onInstallApp,
    setIsAgentsOpen,
    setIsMenuOpen,
    translate,
}: UseHeaderAgentMenusOptions): HeaderAgentMenusState {
    const [isAgentQrCodeOpen, setIsAgentQrCodeOpen] = useState(false);
    const handleShowAgentQrCode = useCallback(() => {
        setIsAgentQrCodeOpen(true);
    }, []);
    const handleCloseAgentQrCode = useCallback(() => {
        setIsAgentQrCodeOpen(false);
    }, []);

    const agentContextMenuItems = useAgentContextMenuItems({
        agent: activeAgentMenuAgent,
        agentName: activeAgentNavigationId || activeAgentMenuAgent.agentName,
        derivedAgentName: activeAgent?.agentName || activeAgentNavigationId || activeAgentMenuAgent.agentName,
        permanentId: activeAgent?.permanentId,
        agentUrl: activeAgentUrl,
        agentEmail: activeAgentEmail,
        folderContext: activeAgentFolderContext,
        isAdmin,
        isAuthenticated,
        onShowQrCode: handleShowAgentQrCode,
        onAgentRenamed,
        onRequestClose: closeAgentViewDropdown,
        installPromptEvent,
        isInstalled,
        onInstallApp,
    });
    const agentMoreViewItems = useMemo(
        () => mapContextMenuItemsToSubMenuItems(agentContextMenuItems),
        [agentContextMenuItems],
    );
    const activeAgentViewItems = useMemo(
        () =>
            buildActiveAgentViewItems({
                activeAgentNavigationId,
                agentMoreViewItems,
                isAdmin,
                translate,
            }),
        [activeAgentNavigationId, agentMoreViewItems, isAdmin, translate],
    );

    const {
        isPreparingDialog,
        openNewAgentDialog,
        dialog: newAgentDialog,
    } = useNewAgentDialog({
        onCreateFailed: async (error) => {
            await showNewAgentFailure('Failed to create agent:', error, namingSingular, translate);
        },
        onPrepareFailed: async (error) => {
            await showNewAgentFailure('Failed to generate agent boilerplate:', error, namingSingular, translate);
        },
    });

    const handleCreateAgent = useCallback(
        (folderId: number | null) => {
            void openNewAgentDialog({ folderId });
            setIsAgentsOpen(false);
            setIsMenuOpen(false);
        },
        [openNewAgentDialog, setIsAgentsOpen, setIsMenuOpen],
    );
    const createNewAgentLabelNode = useMemo(
        () => createNewAgentLabel(isPreparingDialog, namingSingular, translate),
        [isPreparingDialog, namingSingular, translate],
    );
    const createNewAgentText = translate('header.createNewAgent', { agentSingular: namingSingular });
    const viewAllAgentsLabel = translate('header.viewAllAgents', { agentsPlural: namingPlural });
    const agentMenuTreeWithActions = useMemo(
        () =>
            appendFolderActionNodes(agentMenuTree, {
                viewAllLabel: viewAllAgentsLabel,
                createLabel: createNewAgentText,
                renderCreateLabel: createNewAgentLabelNode,
                onCreateInFolder: isPreparingDialog ? undefined : (folderId) => handleCreateAgent(folderId),
            }),
        [
            agentMenuTree,
            createNewAgentLabelNode,
            createNewAgentText,
            handleCreateAgent,
            isPreparingDialog,
            viewAllAgentsLabel,
        ],
    );
    const hierarchyAgentMobileItems = useMemo(
        () => [
            ...createAgentHierarchyMobileItems(agentMenuTreeWithActions),
            ...createHierarchyAgentActionItems(
                viewAllAgentsLabel,
                createNewAgentLabelNode,
                isPreparingDialog,
                handleCreateAgent,
            ),
        ],
        [
            agentMenuTreeWithActions,
            createNewAgentLabelNode,
            handleCreateAgent,
            isPreparingDialog,
            viewAllAgentsLabel,
        ],
    );

    return {
        activeAgentViewItems,
        agentMenuTree: agentMenuTreeWithActions,
        createNewAgentLabel: createNewAgentLabelNode,
        handleCloseAgentQrCode,
        handleCreateAgent,
        hierarchyAgentMobileItems,
        isAgentQrCodeOpen,
        isPreparingDialog,
        newAgentDialog,
        viewAllAgentsLabel,
    };
}
