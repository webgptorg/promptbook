'use client';

import { AdminRouteTabs, type AdminRouteTabItem } from '../_components/AdminRouteTabs';

/**
 * Task-manager scope: one server, or the whole VPS.
 *
 * @private function of TaskManagerClient
 */
export type TaskManagerScope = 'server' | 'vps';

/**
 * Route of the per-server task manager.
 *
 * @private function of TaskManagerScopeTabs
 */
export const SERVER_TASK_MANAGER_PATH = '/admin/task-manager';

/**
 * Route of the VPS-wide (superadmin) task manager.
 *
 * @private function of TaskManagerScopeTabs
 */
export const VPS_TASK_MANAGER_PATH = '/superadmin/task-manager';

/**
 * Route-backed task-manager scope navigation.
 *
 * @private function of TaskManagerScopeTabs
 */
const TASK_MANAGER_SCOPE_NAVIGATION_ITEMS: ReadonlyArray<AdminRouteTabItem<TaskManagerScope>> = [
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
];

/**
 * Props for the task-manager scope tabs.
 *
 * @private function of TaskManagerClient
 */
type TaskManagerScopeTabsProps = {
    /**
     * Currently active scope.
     */
    activeScope: TaskManagerScope;
    /**
     * Whether the VPS-wide tab is available to the current user (superadmin only).
     */
    isSuperAdmin: boolean;
};

/**
 * Renders the tabs interlinking the per-server and VPS-wide task managers.
 *
 * The VPS-wide tab is superadmin-only, so ordinary admins keep the single per-server view with
 * no tab bar at all.
 *
 * @private function of TaskManagerClient
 */
export function TaskManagerScopeTabs({ activeScope, isSuperAdmin }: TaskManagerScopeTabsProps) {
    if (!isSuperAdmin) {
        return null;
    }

    return <AdminRouteTabs activeTabId={activeScope} items={TASK_MANAGER_SCOPE_NAVIGATION_ITEMS} />;
}
