import type { ReactNode } from 'react';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import type { ChatFeedbackMode } from '../../utils/chatFeedbackMode';
import type { UserInfo } from '../../utils/getCurrentUser';
import type { ShibbolethAuthenticationMenuStatus } from '../../constants/shibbolethAuth';
import type { SubMenuItem } from './SubMenuItem';

/**
 * Props accepted by the shared Agents Server header shell.
 *
 * @private type of Header
 */
export type HeaderProps = {
    /**
     * Is the user an admin
     */
    isAdmin?: boolean;
    /**
     * Whether the current admin is the environment-backed super-admin.
     */
    isGlobalAdmin?: boolean;

    /**
     * Current user info (if logged in)
     */
    currentUser?: UserInfo | null;

    /**
     * The name of the server
     */
    serverName: string;

    /**
     * The URL of the logo displayed in the heading bar
     */
    serverLogoUrl: string | null;

    /**
     * List of agents
     */
    agents: Array<AgentOrganizationAgent>;

    /**
     * List of folders that organize local agents.
     */
    agentFolders: Array<AgentOrganizationFolder>;

    /**
     * List of federated servers for navigation dropdown
     */
    federatedServers: Array<{ url: string; title: string; logoUrl?: string | null }>;

    /**
     * Is the experimental app enabled
     */
    isExperimental?: boolean;
    /**
     * Determines which chat feedback mode is active.
     */
    feedbackMode?: ChatFeedbackMode;

    /**
     * Shibboleth authentication status used to show login-method menu entries and warnings.
     */
    shibbolethAuthenticationStatus?: ShibbolethAuthenticationMenuStatus;
};

/**
 * Type describing menu item base.
 */
type MenuItemBase = {
    /**
     * Unique identifier used for hover timers and shared actions.
     */
    readonly id: string;
};

/**
 * One top-level header navigation entry.
 *
 * @private type of Header
 */
export type MenuItem =
    | (MenuItemBase & {
          type: 'link';
          label: ReactNode;
          href: string;
      })
    | (MenuItemBase & {
          type: 'dropdown';
          label: ReactNode;
          isOpen: boolean;
          setIsOpen: (isOpen: boolean) => void;
          isMobileOpen: boolean;
          setIsMobileOpen: (isOpen: boolean) => void;
          items: Array<SubMenuItem>;
          renderMenu?: () => ReactNode;
      });

/**
 * Tracks the currently open nested dropdown along with its anchor rectangle.
 *
 * @private type of Header
 */
export type OpenSubMenuState = {
    key: string;
    rect: DOMRect;
    items: SubMenuItem[];
};

/**
 * Shared interaction mode used by desktop dropdowns and nested submenus.
 *
 * @private type of Header
 */
export type DropdownInteractionMode = 'preview' | 'interactive';
