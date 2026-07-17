'use client';

import { showAlert, showConfirm, showPrompt } from '@/src/components/AsyncDialogs/asyncDialogs';
import { $cancelAdminChatTask, $retryAdminChatTask } from '@/src/utils/chatTasksAdmin';

/**
 * Supported row-level admin task actions.
 *
 * @private shared dialog flow of the admin task manager
 */
export type AdminChatTaskActionKind = 'cancel' | 'retry';

/**
 * Dialog copy used for one admin task action.
 *
 * @private shared dialog flow of the admin task manager
 */
type AdminChatTaskActionDialogCopy = {
    cancelLabel: string;
    confirmLabel: string;
    failureTitle: string;
    promptTitle: string;
    title: string;
    verb: string;
};

/**
 * Resolves dialog copy for the selected admin task action.
 *
 * @private shared dialog flow of the admin task manager
 */
function resolveAdminChatTaskActionDialogCopy(action: AdminChatTaskActionKind): AdminChatTaskActionDialogCopy {
    if (action === 'cancel') {
        return {
            cancelLabel: 'Abort',
            confirmLabel: 'Cancel task',
            failureTitle: 'Cancellation failed',
            promptTitle: 'Cancel task reason',
            title: 'Cancel background task',
            verb: 'Cancel',
        };
    }

    return {
        cancelLabel: 'Abort',
        confirmLabel: 'Retry task',
        failureTitle: 'Retry failed',
        promptTitle: 'Retry task reason',
        title: 'Retry failed task',
        verb: 'Retry',
    };
}

/**
 * Requests confirmation before mutating a durable task.
 *
 * @private shared dialog flow of the admin task manager
 */
export function confirmAdminChatTaskAction(action: AdminChatTaskActionKind, taskId: string): Promise<boolean> {
    const dialogCopy = resolveAdminChatTaskActionDialogCopy(action);

    return showConfirm({
        title: dialogCopy.title,
        message: `${dialogCopy.verb} task "${taskId}"?`,
        confirmLabel: dialogCopy.confirmLabel,
        cancelLabel: dialogCopy.cancelLabel,
    }).catch(() => false);
}

/**
 * Prompts for a required reason before destructive admin actions.
 *
 * @private shared dialog flow of the admin task manager
 */
export async function requestAdminChatTaskActionReason(
    action: AdminChatTaskActionKind,
    taskId: string,
): Promise<string | null> {
    const dialogCopy = resolveAdminChatTaskActionDialogCopy(action);
    const value = await showPrompt({
        title: dialogCopy.promptTitle,
        message: `Provide a short reason for task "${taskId}".`,
        confirmLabel: 'Continue',
        cancelLabel: dialogCopy.cancelLabel,
        placeholder: 'Required reason',
        inputLabel: 'Reason',
    }).catch(() => null);

    const reason = value?.trim() || '';
    if (reason) {
        return reason;
    }

    if (value !== null) {
        await showAlert({
            title: 'Reason required',
            message: 'This action requires a non-empty reason.',
        }).catch(() => undefined);
    }

    return null;
}

/**
 * Performs one admin task action against the API.
 *
 * @private shared dialog flow of the admin task manager
 */
export async function executeAdminChatTaskAction(
    taskId: string,
    action: AdminChatTaskActionKind,
    reason: string,
): Promise<void> {
    if (action === 'cancel') {
        await $cancelAdminChatTask(taskId, { reason });
        return;
    }

    await $retryAdminChatTask(taskId, { reason });
}

/**
 * Surfaces a failed admin task action to the operator.
 *
 * @private shared dialog flow of the admin task manager
 */
export async function showAdminChatTaskActionFailure(action: AdminChatTaskActionKind, error: unknown): Promise<void> {
    const dialogCopy = resolveAdminChatTaskActionDialogCopy(action);

    await showAlert({
        title: dialogCopy.failureTitle,
        message: error instanceof Error ? error.message : 'Task action failed.',
    }).catch(() => undefined);
}
