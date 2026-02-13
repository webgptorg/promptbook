'use server';

import { NextResponse } from 'next/server';
import { getDefaultElevenLabsVoice } from '@/src/utils/elevenlabs/getDefaultElevenLabsVoice';

/** Base ElevenLabs TTS endpoint for generating speech. */
const ELEVENLABS_TTS_ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-speech';

/**
 * Handles TTS playback requests from the Agents Server chat by forwarding them to ElevenLabs.
 *
 * @private Acts as the ElevenLabs proxy for the chat play button.
 */
export async function POST(request: Request) {
    const body = await request.json().catch(() => null);
    const text = typeof body?.text === 'string' ? body.text.trim() : '';

    if (!text) {
        return NextResponse.json({ error: 'Empty text cannot be played.' }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: 'ElevenLabs API key is missing. Set ELEVENLABS_API_KEY on the server.' },
            { status: 500 },
        );
    }

    const voice = getDefaultElevenLabsVoice();

    const response = await fetch(`${ELEVENLABS_TTS_ENDPOINT}/${voice.id}`, {
        method: 'POST',
        headers: {
            Accept: 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
        },
        body: JSON.stringify({
            text,
            model: 'eleven_multilingual_v1',
            voice_settings: {
                stability: 0.45,
                similarity_boost: 0.6,
            },
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('ElevenLabs TTS error:', errorBody);
        return NextResponse.json({ error: errorBody }, { status: response.status });
    }

    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
        headers: {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'no-store',
        },
    });
}
