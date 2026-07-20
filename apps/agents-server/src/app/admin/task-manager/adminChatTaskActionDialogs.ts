'use client';

import { spaceTrim } from 'spacetrim';
import { showAlert, showConfirm, showPrompt } from '@/src/components/AsyncDialogs/asyncDialogs';
import {
    $cancelAdminChatTask,
    $cancelAllAdminChatTasks,
    $retryAdminChatTask,
    type CancelAllAdminChatTasksSummary,
} from '@/src/utils/chatTasksAdmin';

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
 * Prompts for a required non-empty reason and validates the operator input.
 *
 * @private shared dialog flow of the admin task manager
 */
async function requestRequiredAdminActionReason(options: {
    title: string;
    message: string;
    cancelLabel: string;
}): Promise<string | null> {
    const value = await showPrompt({
        title: options.title,
        message: options.message,
        confirmLabel: 'Continue',
        cancelLabel: options.cancelLabel,
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
 * Prompts for a required reason before destructive admin actions.
 *
 * @private shared dialog flow of the admin task manager
 */
export function requestAdminChatTaskActionReason(
    action: AdminChatTaskActionKind,
    taskId: string,
): Promise<string | null> {
    const dialogCopy = resolveAdminChatTaskActionDialogCopy(action);

    return requestRequiredAdminActionReason({
        title: dialogCopy.promptTitle,
        message: `Provide a short reason for task "${taskId}".`,
        cancelLabel: dialogCopy.cancelLabel,
    });
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

/**
 * Requests confirmation before cancelling every active background task at once.
 *
 * @private shared dialog flow of the admin task manager
 */
export function confirmCancelAllActiveAdminChatTasks(): Promise<boolean> {
    return showConfirm({
        title: 'Cancel all background tasks',
        message: 'Cancel every active (queued + running) background task across all users?',
        confirmLabel: 'Cancel all tasks',
        cancelLabel: 'Abort',
    }).catch(() => false);
}

/**
 * Prompts for a required reason before cancelling every active background task.
 *
 * @private shared dialog flow of the admin task manager
 */
export function requestCancelAllActiveAdminChatTasksReason(): Promise<string | null> {
    return requestRequiredAdminActionReason({
        title: 'Cancel all tasks reason',
        message: 'Provide a short reason for cancelling all active background tasks.',
        cancelLabel: 'Abort',
    });
}

/**
 * Performs the bulk cancellation of every active background task against the API.
 *
 * @private shared dialog flow of the admin task manager
 */
export function executeCancelAllActiveAdminChatTasks(reason: string): Promise<CancelAllAdminChatTasksSummary> {
    return $cancelAllAdminChatTasks({ reason });
}

/**
 * Surfaces the outcome of a bulk cancellation to the operator.
 *
 * @private shared dialog flow of the admin task manager
 */
export async function showCancelAllActiveAdminChatTasksResult(summary: CancelAllAdminChatTasksSummary): Promise<void> {
    await showAlert({
        title: 'Cancellation requested',
        message: spaceTrim(
            (block) => `
                Requested cancellation of ${summary.cancelledCount} of ${summary.matchedCount} active background task(s).

                ${block(
                    summary.hasMore
                        ? 'More active tasks remain than could be cancelled in one run — run the action again to continue.'
                        : '',
                )}
            `,
        ),
    }).catch(() => undefined);
}

/**
 * Surfaces a failed bulk cancellation to the operator.
 *
 * @private shared dialog flow of the admin task manager
 */
export async function showCancelAllActiveAdminChatTasksFailure(error: unknown): Promise<void> {
    await showAlert({
        title: 'Cancellation failed',
        message: error instanceof Error ? error.message : 'Failed to cancel all tasks.',
    }).catch(() => undefined);
}
