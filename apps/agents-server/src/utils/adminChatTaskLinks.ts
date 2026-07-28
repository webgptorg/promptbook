import { buildExistingAgentChatHref } from './agentRouting/agentRouteHrefs';
import type { AdminChatTaskRecord } from './chatTasksAdmin';
import { createServerPublicUrl } from './serverRegistry';

/**
 * Browser page route of the super-admin standalone VPS self-update panel.
 *
 * @private internal admin utility of Agents Server
 */
const VPS_SELF_UPDATE_PAGE_ROUTE = '/superadmin/update';

/**
 * Synthetic task-id prefix shared by every standalone VPS self-update task row.
 *
 * Lives in this browser-safe module so both the server-side task mapper and the super-admin update
 * page build the exact same task id (DRY), letting the update page link back to its own task.
 *
 * @private internal admin utility of Agents Server
 */
export const VPS_SELF_UPDATE_ADMIN_CHAT_TASK_ID_PREFIX = 'vps-self-update';

/**
 * Synthetic task-id prefix shared by VPS server setup and certificate-maintenance task rows.
 *
 * @private internal admin utility of Agents Server
 */
export const VPS_SERVER_SETUP_ADMIN_CHAT_TASK_ID_PREFIX = 'vps-server-setup';

/**
 * Link from one admin task to the Agents Server page it operates on (task → page).
 *
 * Every durable background task acts on exactly one place in the Agents Server — a chat thread, the
 * self-update panel, a previewed page,... — and this describes the button that opens it.
 *
 * @private internal admin utility of Agents Server
 */
export type AdminChatTaskTargetLink = {
    /**
     * Href of the page the task operates on.
     */
    href: string;

    /**
     * Short button label.
     */
    label: string;

    /**
     * Accessible button title.
     */
    title: string;

    /**
     * Whether the href points outside the app and should open in a new browser tab.
     */
    isExternal: boolean;
};

/**
 * Resolves the page one admin task links to (task → page), or `null` when the task has no target.
 *
 * This is the single source of truth for the task-manager "open the thing this task is doing" button,
 * reused by both the task row and the task detail page so the forward link stays consistent (DRY).
 *
 * @param task - Admin task-manager row.
 * @returns Target link, or `null` when the task kind has no linkable page.
 *
 * @private internal admin utility of Agents Server
 */
export function resolveAdminChatTaskTargetLink(task: AdminChatTaskRecord): AdminChatTaskTargetLink | null {
    switch (task.kind) {
        case 'CHAT_COMPLETION':
        case 'CHAT_TIMEOUT':
            if (!task.agentPermanentId || !task.chatId) {
                return null;
            }
            {
                const chatHref = buildExistingAgentChatHref(task.agentPermanentId, task.chatId);
                const isForeignServer = Boolean(task.serverDomain);

                return {
                    href: isForeignServer
                        ? new URL(chatHref, createServerPublicUrl(task.serverDomain!)).toString()
                        : chatHref,
                    label: 'Open chat',
                    title: 'Open the chat thread this task belongs to',
                    isExternal: isForeignServer,
                };
            }
        case 'VPS_SELF_UPDATE':
            return {
                href: VPS_SELF_UPDATE_PAGE_ROUTE,
                label: 'Open update',
                title: 'Open the standalone VPS self-update page',
                isExternal: false,
            };
        case 'VPS_SERVER_SETUP':
            return {
                href: '/superadmin/servers',
                label: 'Open servers',
                title: 'Open the super admin servers page',
                isExternal: false,
            };
        case 'BROWSER_PREVIEW':
            if (!isAbsoluteHttpUrl(task.chatId)) {
                return null;
            }
            return {
                href: task.chatId,
                label: 'Open page',
                title: 'Open the previewed page in a new tab',
                isExternal: true,
            };
        default:
            return null;
    }
}

/**
 * Builds the admin href of the detail page dedicated to one task (page → task, and the task's own page).
 *
 * @param taskId - Id of the durable task.
 * @returns Admin task detail page href.
 *
 * @private internal admin utility of Agents Server
 */
export function buildAdminChatTaskDetailHref(taskId: string, serverDomain?: string | null): string {
    const href = `/admin/task-manager/${encodeURIComponent(taskId)}`;
    if (!serverDomain) {
        return href;
    }

    return `${href}?serverDomain=${encodeURIComponent(serverDomain)}`;
}

/**
 * Builds the synthetic admin task id of one standalone VPS self-update run.
 *
 * @param jobIdentity - Stable identity of the self-update run.
 * @returns Synthetic self-update task id.
 *
 * @private internal admin utility of Agents Server
 */
export function buildVpsSelfUpdateAdminChatTaskId(jobIdentity: string): string {
    return `${VPS_SELF_UPDATE_ADMIN_CHAT_TASK_ID_PREFIX}:${jobIdentity}`;
}

/**
 * Builds the synthetic admin task id of one VPS server setup run.
 *
 * @param taskIdentity - Stable identity of the setup run.
 * @returns Synthetic server-setup task id.
 *
 * @private internal admin utility of Agents Server
 */
export function buildVpsServerSetupAdminChatTaskId(taskIdentity: string): string {
    return `${VPS_SERVER_SETUP_ADMIN_CHAT_TASK_ID_PREFIX}:${taskIdentity}`;
}

/**
 * Detects an absolute http(s) URL, used to guard the browser-preview target link.
 *
 * @param value - Candidate URL.
 * @returns `true` when the value is an absolute http(s) URL.
 *
 * @private function of `resolveAdminChatTaskTargetLink`
 */
function isAbsoluteHttpUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
}
