import type { ChatSoundSystem } from '../../Chat/ChatProps';
import type { ChatMessage } from '../../types/ChatMessage';
import type { ChatEffectConfig } from './ChatEffectConfig';

/**
 * Props for the ChatEffectsSystem component
 *
 * @public exported from `@promptbook/components`
 */
export interface ChatEffectsSystemProps {
    /**
     * Array of chat messages to monitor for effect triggers
     */
    messages: ReadonlyArray<ChatMessage>;

    /**
     * Array of effect configurations
     * Defines which emojis/patterns trigger which effects
     */
    effectConfigs: ReadonlyArray<ChatEffectConfig>;

    /**
     * Optional filter function to determine if a message should trigger effects
     * By default, only agent messages trigger effects
     */
    shouldTriggerEffect?: (message: ChatMessage) => boolean;

    /**
     * CSS class name for the effects container
     */
    className?: string;

    /**
     * Optional sound system to play sounds when effects are triggered
     */
    soundSystem?: ChatSoundSystem;
}
