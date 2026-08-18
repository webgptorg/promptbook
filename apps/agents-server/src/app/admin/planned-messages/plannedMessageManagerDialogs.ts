'use client';

import { showAlert, showConfirm } from '@/src/components/AsyncDialogs/asyncDialogs';
import type { PlannedMessageManagerRecord } from '@/src/utils/plannedMessagesAdmin';
import { spaceTrim } from 'spacetrim';
import { resolvePlannedMessageText } from './plannedMessageManagerPresentation';

/**
 * Asks the administrator to confirm cancelling one planned message.
 *
 * @param plannedMessage - Planned message about to be cancelled.
 * @returns `true` when the administrator confirmed.
 *
 * @private shared dialog flow of the admin planned-message manager
 */
export function confirmCancelPlannedMessage(plannedMessage: PlannedMessageManagerRecord): Promise<boolean> {
    return showConfirm({
        title: 'Cancel planned message',
        message: spaceTrim(
            (block) => `
                Cancel this planned message of "${plannedMessage.agentName || plannedMessage.agentPermanentId}"?

                ${block(resolvePlannedMessageText(plannedMessage))}

                It never wakes the agent again, and stays listed as cancelled.
            `,
        ),
        confirmLabel: 'Cancel planned message',
        cancelLabel: 'Keep it',
    }).catch(() => false);
}

/**
 * Surfaces a failed planned-message action to the administrator.
 *
 * @param title - Short title naming what failed.
 * @param error - Error thrown by the action.
 *
 * @private shared dialog flow of the admin planned-message manager
 */
export async function showPlannedMessageActionFailure(title: string, error: unknown): Promise<void> {
    await showAlert({
        title,
        message: error instanceof Error ? error.message : 'The planned-message action failed.',
    }).catch(() => undefined);
}
