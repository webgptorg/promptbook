import type { MockedChatViewportPreset, MockedChatViewportPresetMetadata } from './MockedChatPreset';

/**
 * Viewport dimensions used by recording-oriented viewer mode.
 */
export const MOCKED_CHAT_VIEWPORT_PRESETS: Record<MockedChatViewportPreset, MockedChatViewportPresetMetadata> = {
    PHONE_PORTRAIT: {
        label: 'Phone portrait (390 x 844)',
        width: 390,
        height: 844,
    },
    TABLET_LANDSCAPE: {
        label: 'Tablet landscape (1024 x 768)',
        width: 1024,
        height: 768,
    },
    LAPTOP: {
        label: 'Laptop (1366 x 768)',
        width: 1366,
        height: 768,
    },
    FULL_HD: {
        label: 'Full HD (1920 x 1080)',
        width: 1920,
        height: 1080,
    },
};
