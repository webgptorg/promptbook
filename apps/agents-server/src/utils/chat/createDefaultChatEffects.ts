import type { ChatEffectConfig } from '../../../../../src/book-components/Chat/effects/types/ChatEffectConfig';

/**
 * Creates the default chat effect configurations for the agents server
 *
 * This includes:
 * - 🎉 confetti effect
 * - ❤️ (and other heart emojis) hearts effect
 *
 * @returns Array of chat effect configurations
 */
export function createDefaultChatEffects(): ReadonlyArray<ChatEffectConfig> {
    return [
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
}
