import type { ChatMessage } from '../types/ChatMessage';
import { resolveToolCallState } from '../utils/resolveToolCallState';

/**
 * Maps tool-call state into friendly running copy used by simple modal sections.
 *
 * @param toolCall - Tool call currently rendered in the modal.
 * @returns Friendly progress message for the current tool state.
 * @private function of ChatToolCallModal
 */
export function resolveToolCallProgressMessage(toolCall: NonNullable<ChatMessage['toolCalls']>[number]): string {
    switch (resolveToolCallState(toolCall)) {
        case 'PENDING':
            return 'The action has started and details are still arriving.';
        case 'PARTIAL':
            return 'The action is still running. More details will appear as they arrive.';
        case 'ERROR':
            return 'The action stopped with an error. Partial details are still available below.';
        case 'COMPLETE':
            return 'The action finished.';
    }
}
