import { SoundSystem } from './SoundSystem';

type CreateDefaultSoundSystemOptions = {
    readonly initialIsSoundsOn?: boolean;
    readonly initialIsVibrationOn?: boolean;
    readonly soundStorageKey?: string;
    readonly vibrationStorageKey?: string;
};

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
export function createDefaultSoundSystem(options?: CreateDefaultSoundSystemOptions): SoundSystem {
    return new SoundSystem(
        {
            message_send: {
                path: '/sounds/whoosh.mp3',
                volume: 0.3,
                allowOverlap: false,
            },
            message_receive: {
                path: '/sounds/ding.mp3',
                volume: 0.4,
                allowOverlap: false,
            },
            tool_call_chip: {
                path: '/sounds/ding.mp3',
                volume: 0.35,
                allowOverlap: true,
            },
            message_typing: {
                path: '/sounds/typing.mp3',
                volume: 0.2,
                allowOverlap: false,
            },
            button_click: {
                path: '/sounds/tap.mp3',
                volume: 0.25,
                allowOverlap: true, // Allow multiple button clicks to overlap
            },
            effect_confetti: {
                path: '/sounds/confetti.mp3',
                volume: 0.35,
                allowOverlap: false,
            },
            effect_hearts: {
                path: '/sounds/hearts.mp3',
                volume: 0.3,
                allowOverlap: false,
            },
        },
        {
            storageKey: options?.soundStorageKey ?? 'promptbook_chat_sounds_enabled',
            vibrationStorageKey: options?.vibrationStorageKey ?? 'promptbook_chat_vibration_enabled',
            initialSoundsEnabled: options?.initialIsSoundsOn,
            initialVibrationEnabled: options?.initialIsVibrationOn,
        },
    );
}
