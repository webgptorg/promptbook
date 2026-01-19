import type { ChatEffectType } from './ChatEffectType';

/**
 * Represents a chat effect instance
 *
 * @public exported from `@promptbook/components`
 */
export interface ChatEffect {
    /**
     * Unique identifier for this effect instance
     */
    id: string;

    /**
     * Type of effect
     */
    type: ChatEffectType;

    /**
     * Timestamp when the effect was triggered
     */
    timestamp: number;
}
