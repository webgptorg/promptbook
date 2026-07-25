'use client';

import Link from 'next/link';

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
export const VPS_TASK_MANAGER_PATH = '/admin/task-manager-vps';

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
 * Renders one scope tab link.
 *
 * @private function of TaskManagerScopeTabs
 */
function TaskManagerScopeTab({ href, label, isActive }: { href: string; label: string; isActive: boolean }) {
    return (
        <Link
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
                isActive
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
        >
            {label}
        </Link>
    );
}

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

    return (
        <div className="flex flex-wrap items-center gap-1 border-b border-gray-200">
            <TaskManagerScopeTab href={SERVER_TASK_MANAGER_PATH} label="This server" isActive={activeScope === 'server'} />
            <TaskManagerScopeTab
                href={VPS_TASK_MANAGER_PATH}
                label="All servers (VPS)"
                isActive={activeScope === 'vps'}
            />
        </div>
    );
}
