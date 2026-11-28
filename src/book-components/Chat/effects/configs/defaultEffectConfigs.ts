import type { ChatEffectConfig } from '../types/ChatEffectConfig';

/**
 * Default effect configurations for common chat emojis
 *
 * @public exported from `@promptbook/components`
 */
export const defaultEffectConfigs: ReadonlyArray<ChatEffectConfig> = [
    {
        trigger: '🎉',
        effectType: 'CONFETTI',
    },
    {
        trigger: /❤️|❤|💙|💚|💛|💜|🧡|💖|💗|💕|💓|💝|💞|💟|♥️|♥/,
        effectType: 'HEARTS',
        matchAllHeartEmojis: true,
    },
];
