/**
 * Metadata key controlling the default chat visual mode.
 */
export const CHAT_VISUAL_MODE_METADATA_KEY = 'CHAT_VISUAL_MODE';

/**
 * Supported visual presentation modes for chat messages.
 */
export const CHAT_VISUAL_MODES = {
    BUBBLE_MODE: 'BUBBLE_MODE',
    ARTICLE_MODE: 'ARTICLE_MODE',
} as const;

/**
 * Union of supported chat visual mode values.
 */
export type ChatVisualMode = (typeof CHAT_VISUAL_MODES)[keyof typeof CHAT_VISUAL_MODES];

/**
 * Shared select options for default chat visual mode configuration.
 */
export const CHAT_VISUAL_MODE_OPTIONS: ReadonlyArray<{
    readonly value: ChatVisualMode;
    readonly label: string;
}> = [
    {
        value: CHAT_VISUAL_MODES.BUBBLE_MODE,
        label: 'Bubble mode',
    },
    {
        value: CHAT_VISUAL_MODES.ARTICLE_MODE,
        label: 'Article mode',
    },
] as const;

/**
 * Local storage key used for per-browser visual mode overrides.
 */
export const CHAT_VISUAL_MODE_STORAGE_KEY = 'promptbook_agents_chat_visual_mode';

/**
 * Cookie key used so server-rendered pages can respect browser overrides.
 */
export const CHAT_VISUAL_MODE_COOKIE_NAME = 'promptbook_agents_chat_visual_mode';

/**
 * Fallback visual mode when metadata/browser values are missing or invalid.
 */
export const DEFAULT_CHAT_VISUAL_MODE: ChatVisualMode = CHAT_VISUAL_MODES.BUBBLE_MODE;

/**
 * Resolves one raw visual mode value to a supported mode.
 *
 * @param value - Raw metadata/cookie/local-storage value.
 * @returns Safe supported visual mode.
 */
export function resolveChatVisualMode(value: string | null | undefined): ChatVisualMode {
    if (value === CHAT_VISUAL_MODES.ARTICLE_MODE) {
        return CHAT_VISUAL_MODES.ARTICLE_MODE;
    }

    return CHAT_VISUAL_MODES.BUBBLE_MODE;
}
