import type { MockedChatTimingPreset } from './MockedChatPreset';

/**
 * Timing multipliers used to derive playback offsets from stored offsets.
 */
export const MOCKED_CHAT_TIMING_PRESET_MULTIPLIERS: Record<MockedChatTimingPreset, number> = {
    FAST: 0.6,
    NORMAL: 1,
    SLOW: 1.6,
};
