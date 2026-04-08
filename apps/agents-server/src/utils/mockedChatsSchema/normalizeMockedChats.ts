import type { MockedChatPreset } from './MockedChatPreset';
import { MAX_MOCKED_CHATS_PER_USER } from './MOCKED_CHATS_USER_DATA_KEY';
import { normalizeMockedChatPreset } from './normalizeMockedChatPreset';

/**
 * Normalizes a list of presets while preserving deterministic ordering by update date.
 */
export function normalizeMockedChats(value: unknown): Array<MockedChatPreset> {
    if (!Array.isArray(value)) {
        return [];
    }

    const normalized = value
        .slice(0, MAX_MOCKED_CHATS_PER_USER)
        .map((item) => normalizeMockedChatPreset(item))
        .filter((item): item is MockedChatPreset => item !== null);

    return normalized.sort((leftPreset, rightPreset) => {
        const leftTimestamp = Date.parse(leftPreset.updatedAt);
        const rightTimestamp = Date.parse(rightPreset.updatedAt);

        return rightTimestamp - leftTimestamp;
    });
}
