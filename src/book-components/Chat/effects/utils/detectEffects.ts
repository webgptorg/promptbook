import type { ChatMessage } from '../../types/ChatMessage';
import type { ChatEffectConfig } from '../types/ChatEffectConfig';
import type { ChatEffectType } from '../types/ChatEffectType';

/**
 * Detects which effects should be triggered based on message content
 *
 * @param message - The chat message to analyze
 * @param effectConfigs - Array of effect configurations
 * @returns Array of unique effect types to trigger
 * @private utility function of Effects system
 */
export function detectEffects(message: ChatMessage, effectConfigs: ReadonlyArray<ChatEffectConfig>): ChatEffectType[] {
    const triggeredEffects = new Set<ChatEffectType>();
    const content = message.content;

    for (const config of effectConfigs) {
        let shouldTrigger = false;

        if (typeof config.trigger === 'string') {
            shouldTrigger = content.includes(config.trigger);
        } else if (config.trigger instanceof RegExp) {
            shouldTrigger = config.trigger.test(content);
        }

        if (shouldTrigger) {
            triggeredEffects.add(config.effectType);
        }
    }

    return Array.from(triggeredEffects);
}
