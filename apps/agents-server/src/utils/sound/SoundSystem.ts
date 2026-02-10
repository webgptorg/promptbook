import type { ChatSoundSystem } from '../../../../../src/book-components/Chat/Chat/ChatProps';
import { getSoundPreferences, setSoundsEnabled, subscribeToSoundPreferences } from './preferences';

/**
 * Sound event types that can be triggered in the chat
 */
export type SoundEvent =
    | 'message_send' // When user sends a message
    | 'message_receive' // When agent sends a message
    | 'message_typing' // When agent is typing/thinking
    | 'message_stream_chunk' // When streaming tokens arrive
    | 'button_click' // When any button is clicked
    | 'tool_call_chip' // When a tool call chip is rendered
    | 'effect_confetti' // When confetti effect is triggered
    | 'effect_hearts'; // When hearts effect is triggered

/**
 * Configuration for a sound
 */
export type SoundConfig = {
    /**
     * Path to the sound file (relative to public folder)
     */
    path: string;

    /**
     * Volume level (0.0 to 1.0)
     * @default 0.5
     */
    volume?: number;

    /**
     * Whether the sound can be played multiple times simultaneously
     * @default false
     */
    allowOverlap?: boolean;
};

/**
 * SoundSystem class for managing chat sounds
 *
 * This class provides:
 * - Centralized sound management
 * - Enable/disable functionality with localStorage persistence
 * - Volume control
 * - Preloading of sound assets
 * - Prevention of sound overlap
 *
 * @example
 * ```typescript
 * const soundSystem = new SoundSystem({
 *   message_send: { path: '/sounds/whoosh.mp3', volume: 0.3 },
 *   message_receive: { path: '/sounds/ding.mp3', volume: 0.4 }
 * });
 *
 * soundSystem.play('message_send');
 * soundSystem.setEnabled(false);
 * ```
 */
export class SoundSystem implements ChatSoundSystem {
    private sounds: Map<SoundEvent, HTMLAudioElement[]> = new Map();
    private soundConfigs: Map<SoundEvent, SoundConfig> = new Map();
    private soundsEnabled: boolean;
    private vibrationEnabled: boolean;
    private preferencesUnsubscribe: (() => void) | null = null;
    private currentlyPlaying: Map<SoundEvent, HTMLAudioElement | null> = new Map();

    /**
     * Creates a new SoundSystem instance
     *
     * @param soundMap - Map of sound events to their configurations
     * @param storageKey - Key for localStorage persistence (optional)
     */
    constructor(soundMap: Partial<Record<SoundEvent, SoundConfig>>) {
        const preferences = getSoundPreferences();
        this.soundsEnabled = preferences.isSoundsEnabled;
        this.vibrationEnabled = preferences.isVibrationEnabled;

        // Initialize sound configurations
        for (const [event, config] of Object.entries(soundMap) as Array<[SoundEvent, SoundConfig]>) {
            this.soundConfigs.set(event, {
                volume: 0.5,
                allowOverlap: false,
                ...config,
            });
        }

        // Preload sounds if in browser environment
        if (typeof window !== 'undefined') {
            this.preloadSounds();
        }

        this.preferencesUnsubscribe = subscribeToSoundPreferences(({ isSoundsEnabled, isVibrationEnabled }) => {
            this.soundsEnabled = isSoundsEnabled;
            this.vibrationEnabled = isVibrationEnabled;
        });
    }

    /**
     * Preloads all sound assets
     */
    private preloadSounds(): void {
        for (const [event, config] of this.soundConfigs.entries()) {
            // Create multiple audio elements for potential overlap
            const audioElements: HTMLAudioElement[] = [];

            // Create 3 instances to allow some overlap if needed
            for (let i = 0; i < 3; i++) {
                const audio = new Audio(config.path);
                audio.volume = config.volume ?? 0.5;
                audio.preload = 'auto';
                audioElements.push(audio);
            }

            this.sounds.set(event, audioElements);
        }
    }

    /**
     * Plays a sound for the given event
     *
     * @param event - The sound event to play (as string to match ChatSoundSystem interface)
     * @returns Promise that resolves when the sound finishes playing
     */
    public async play(event: string): Promise<void> {
        this.vibrate(event);
        if (!this.soundsEnabled) {
            return;
        }

        const audioElements = this.sounds.get(event as SoundEvent);
        const config = this.soundConfigs.get(event as SoundEvent);

        if (!audioElements || audioElements.length === 0 || !config) {
            return;
        }

        // Check if overlap is allowed
        if (!config.allowOverlap) {
            const currentAudio = this.currentlyPlaying.get(event as SoundEvent);
            if (currentAudio && !currentAudio.paused) {
                // Sound is already playing, don't play again
                return;
            }
        }

        // Find an available audio element (not currently playing)
        let audio = audioElements.find((a) => a.paused);

        // If all are playing and overlap is allowed, use the first one
        if (!audio && config.allowOverlap) {
            audio = audioElements[0];
        }

        if (!audio) {
            return;
        }

        try {
            // Reset audio to beginning
            audio.currentTime = 0;
            audio.volume = config.volume ?? 0.5;

            // Track currently playing
            this.currentlyPlaying.set(event as SoundEvent, audio);

            // Play the sound
            await audio.play();

            // Clear tracking when finished
            audio.onended = () => {
                if (this.currentlyPlaying.get(event as SoundEvent) === audio) {
                    this.currentlyPlaying.set(event as SoundEvent, null);
                }
            };
        } catch (error) {
            console.warn(`Failed to play sound for event "${event}":`, error);
        }
    }

    /**
     * Triggers a vibration pattern based on the event
     *
     * @param event - The sound event to vibrate for
     */
    public vibrate(event: string): void {
        if (!this.vibrationEnabled) {
            return;
        }

        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
            // Note: Add more specific vibration patterns for different events
            switch (event as SoundEvent) {
                case 'message_send':
                    navigator.vibrate(100);
                    break;
                case 'message_receive':
                    navigator.vibrate([100, 50, 100]);
                    break;
                case 'tool_call_chip':
                    navigator.vibrate([60, 30, 60]);
                    break;
                case 'message_stream_chunk':
                    navigator.vibrate(20);
                    break;
                case 'button_click':
                    navigator.vibrate(50);
                    break;
                default:
                    // No vibration for other events
                    break;
            }
        }
    }

    /**
     * Enables or disables all sounds
     *
     * @param enabled - Whether sounds should be enabled
     */
    public setEnabled(enabled: boolean): void {
        setSoundsEnabled(enabled);
    }

    /**
     * Checks if sounds are currently enabled
     *
     * @returns True if sounds are enabled
     */
    public isEnabled(): boolean {
        return this.soundsEnabled;
    }

    /**
     * Toggles the enabled state
     *
     * @returns The new enabled state
     */
    public toggle(): boolean {
        const next = !this.soundsEnabled;
        setSoundsEnabled(next);
        return next;
    }

    /**
     * Cleans up the preference listener to avoid leaks.
     */
    public dispose(): void {
        this.preferencesUnsubscribe?.();
        this.preferencesUnsubscribe = null;
    }

    /**
     * Sets the volume for a specific sound event
     *
     * @param event - The sound event
     * @param volume - Volume level (0.0 to 1.0)
     */
    public setVolume(event: SoundEvent, volume: number): void {
        const config = this.soundConfigs.get(event);
        if (!config) {
            return;
        }

        config.volume = Math.max(0, Math.min(1, volume));

        // Update all audio elements for this event
        const audioElements = this.sounds.get(event);
        if (audioElements) {
            audioElements.forEach((audio) => {
                audio.volume = config.volume ?? 0.5;
            });
        }
    }

    /**
     * Sets the global volume for all sounds
     *
     * @param volume - Volume level (0.0 to 1.0)
     */
    public setGlobalVolume(volume: number): void {
        const clampedVolume = Math.max(0, Math.min(1, volume));

        for (const [event, config] of this.soundConfigs.entries()) {
            config.volume = clampedVolume;

            const audioElements = this.sounds.get(event);
            if (audioElements) {
                audioElements.forEach((audio) => {
                    audio.volume = clampedVolume;
                });
            }
        }
    }

    /**
     * Stops all currently playing sounds
     */
    public stopAll(): void {
        for (const audioElements of this.sounds.values()) {
            audioElements.forEach((audio) => {
                audio.pause();
                audio.currentTime = 0;
            });
        }
        this.currentlyPlaying.clear();
    }
}
