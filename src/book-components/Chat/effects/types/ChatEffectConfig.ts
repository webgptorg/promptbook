import type { ChatEffectType } from './ChatEffectType';

/**
 * Configuration for a chat effect trigger
 *
 * @public exported from `@promptbook/components`
 */
export type ChatEffectConfig = {
    /**
     * Emoji or pattern that triggers this effect
     */
    trigger: string | RegExp;

    /**
     * Type of effect to trigger
     */
    effectType: ChatEffectType;

    /**
     * Whether to match all heart emojis (❤️, 💙, 💚, etc.)
     * Only relevant for heart effects
     */
    matchAllHeartEmojis?: boolean;
};
