import { SoundSystem } from './SoundSystem';

/**
 * Creates the default SoundSystem instance for the agents server
 *
 * This includes gentle, non-annoying sounds for:
 * - message_send: Subtle "whoosh" sound
 * - message_receive: Soft "ding" sound
 * - message_typing: Light typing indicator sound
 * - button_click: Light "tap" sound
 * - effect_confetti: Celebratory sound for confetti
 * - effect_hearts: Gentle sound for hearts
 *
 * @returns A configured SoundSystem instance
 */
export function createDefaultSoundSystem(): SoundSystem {
    return new SoundSystem(
        {
            message_send: {
                path: '/sounds/whoosh.wav',
                volume: 0.3,
                allowOverlap: false,
            },
            message_receive: {
                path: '/sounds/ding.wav',
                volume: 0.4,
                allowOverlap: false,
            },
            message_typing: {
                path: '/sounds/typing.wav',
                volume: 0.2,
                allowOverlap: false,
            },
            button_click: {
                path: '/sounds/tap.wav',
                volume: 0.25,
                allowOverlap: true, // Allow multiple button clicks to overlap
            },
            effect_confetti: {
                path: '/sounds/confetti.wav',
                volume: 0.35,
                allowOverlap: false,
            },
            effect_hearts: {
                path: '/sounds/hearts.wav',
                volume: 0.3,
                allowOverlap: false,
            },
        },
        'promptbook_chat_sounds_enabled',
    );
}
