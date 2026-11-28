import { showConfirm } from '@/src/components/AsyncDialogs/asyncDialogs';
import type { MockedChatPreset } from '@/src/utils/mockedChatsSchema';

/**
 * Requests confirmation before deleting one mocked chat.
 *
 * @private function of <MockedChatsEditorClient/>
 */
export async function confirmDeleteMockedChat(targetChat: MockedChatPreset): Promise<boolean> {
    return showConfirm({
        title: 'Delete mocked chat',
        message: `Delete "${targetChat.name}"? This cannot be undone.`,
        confirmLabel: 'Delete mocked chat',
        cancelLabel: 'Cancel',
    }).catch(() => false);
}
