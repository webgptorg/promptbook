'use client';

import { AdminRouteTabs, type AdminRouteTabItem } from './AdminRouteTabs';

/**
 * Sections of the admin background-work tab group.
 *
 * @private shared admin UI type
 */
export type AdminTaskManagerTabId = 'server' | 'vps' | 'planned-messages';

/**
 * Task-manager scope: one server, or the whole VPS.
 *
 * @private shared admin UI type
 */
export type TaskManagerScope = Exclude<AdminTaskManagerTabId, 'planned-messages'>;

/**
 * Route of the per-server task manager.
 *
 * @private shared admin UI constant
 */
export const SERVER_TASK_MANAGER_PATH = '/admin/task-manager';

/**
 * Route of the VPS-wide (superadmin) task manager.
 *
 * @private shared admin UI constant
 */
export const VPS_TASK_MANAGER_PATH = '/superadmin/task-manager';

/**
 * Route of the planned-message manager.
 *
 * @private shared admin UI constant
 */
export const PLANNED_MESSAGE_MANAGER_PATH = '/admin/planned-messages';

/**
 * Route-backed sections of the admin background-work tab group.
 *
 * The task managers show what background work is running right now; the planned-message manager shows
 * the plans that keep creating some of that work. They belong to one tab group because an
 * administrator answering "why does this agent keep waking up?" needs to move between the two.
 *
 * @private constant of AdminTaskManagerTabs
 */
const ADMIN_TASK_MANAGER_TAB_ITEMS: ReadonlyArray<AdminRouteTabItem<AdminTaskManagerTabId>> = [
    {
        id: 'server',
        href: SERVER_TASK_MANAGER_PATH,
        label: 'This server',
    },
    {
        id: 'vps',
        href: VPS_TASK_MANAGER_PATH,
        label: 'All servers (VPS)',
    },
    {
        id: 'planned-messages',
        href: PLANNED_MESSAGE_MANAGER_PATH,
        label: 'Planned messages',
    },
];

/**
 * Props for the admin background-work tabs.
 *
 * @private shared admin UI type
 */
type AdminTaskManagerTabsProps = {
    /**
     * Section the current page belongs to.
     */
    readonly activeTabId: AdminTaskManagerTabId;

    /**
     * Whether the VPS-wide tab is available to the current user (superadmin only).
     */
    readonly isSuperAdmin: boolean;
};

/**
 * Renders the tabs interlinking the task managers and the planned-message manager.
 *
 * The VPS-wide tab is superadmin-only, so an ordinary admin moves between the two per-server sections.
 *
 * @private shared admin UI component
 */
export function AdminTaskManagerTabs({ activeTabId, isSuperAdmin }: AdminTaskManagerTabsProps) {
    const visibleTabItems = ADMIN_TASK_MANAGER_TAB_ITEMS.filter(
        (tabItem) => tabItem.id !== 'vps' || isSuperAdmin,
    );

    return <AdminRouteTabs activeTabId={activeTabId} items={visibleTabItems} />;
}
