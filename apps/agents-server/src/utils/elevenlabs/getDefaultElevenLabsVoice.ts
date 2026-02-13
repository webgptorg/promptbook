'use server';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Represents human-readable information about an ElevenLabs voice.
 *
 * @private internal helper for the Agents Server ElevenLabs integration
 */
export type ElevenLabsVoice = {
    readonly id: string;
    readonly name: string;
    readonly previewUrl?: string;
};

/**
 * Loads the configured ElevenLabs voice definition and falls back to defaults.
 *
 * @private internal helper for `/api/elevenlabs/speech`
 */
export function getDefaultElevenLabsVoice(): ElevenLabsVoice {
    const path = join(process.cwd(), 'apps', 'agents-server', 'config', 'elevenlabs-voice.json');
    try {
        const file = readFileSync(path, 'utf8');
        return JSON.parse(file) as ElevenLabsVoice;
    } catch (error) {
        console.warn('Unable to load ElevenLabs voice config, using fallback.', error);
        return {
            id: process.env.ELEVENLABS_VOICE_ID || 'alloy',
            name: 'Default voice',
        };
    }
}
