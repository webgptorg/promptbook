import { respondIfClientVersionIsOutdated } from '../../../../utils/clientVersionGuard';
import { getMetadata } from '@/src/database/getMetadata';
import { textToSpeechText } from '../../../../utils/textToSpeechText';

/**
 * Base URL of the ElevenLabs API.
 *
 * @private
 */
const ELEVEN_LABS_BASE_URL = process.env.ELEVEN_LABS_API_BASE_URL ?? 'https://api.elevenlabs.io';

/**
 * Voice identifier that will be used when synthesizing chat messages.
 *
 * @private
 */
const ELEVEN_LABS_VOICE_ID = process.env.ELEVEN_LABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM';

/**
 * Model that drives the text-to-speech generation.
 *
 * @private
 */
const ELEVEN_LABS_MODEL_ID = process.env.ELEVEN_LABS_MODEL_ID ?? 'eleven_multilingual_v2';

/**
 * API key required to authenticate with ElevenLabs.
 *
 * @private
 */
const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;

/**
 * Maximum number of characters that are sent to a single ElevenLabs TTS request.
 *
 * @private
 */
const MAX_ELEVEN_LABS_TEXT_LENGTH = 4500;

/**
 * Handles the OPTIONS request from the chat for CORS / preflight.
 *
 * @private
 */
export function OPTIONS() {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-promptbook-client-version',
        },
    });
}

/**
 * Synthesizes the provided text using the ElevenLabs text-to-speech API and
 * returns the resulting audio stream.
 *
 * @private
 */
export async function POST(request: Request) {
    const versionMismatchResponse = respondIfClientVersionIsOutdated(request, 'json');
    if (versionMismatchResponse) {
        return versionMismatchResponse;
    }

    const isSpeechEnabled = (await getMetadata('IS_EXPERIMENTAL_VOICE_TTS_STT_ENABLED')) === 'true';
    if (!isSpeechEnabled) {
        return new Response(JSON.stringify({ error: 'Text-to-speech is disabled on this server.' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    if (!ELEVEN_LABS_API_KEY) {
        return new Response(
            JSON.stringify({
                error: 'ElevenLabs API key is not configured on the server.',
            }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        );
    }

    const payload = (await request.json().catch(() => null)) as { text?: string; voiceId?: string } | null;
    const rawText = (payload?.text?.toString() ?? '').trim();
    const requestedVoiceId = payload?.voiceId?.toString().trim();
    const voiceIdToUse = requestedVoiceId || ELEVEN_LABS_VOICE_ID;

    if (!rawText) {
        return new Response(
            JSON.stringify({
                error: 'Missing text to speak.',
            }),
            {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        );
    }

    const cleanedText = textToSpeechText(rawText) || rawText;
    const limitedText =
        cleanedText.length > MAX_ELEVEN_LABS_TEXT_LENGTH
            ? cleanedText.slice(0, MAX_ELEVEN_LABS_TEXT_LENGTH).trim()
            : cleanedText;

    const elevenLabsResponse = await fetch(`${ELEVEN_LABS_BASE_URL}/v1/text-to-speech/${voiceIdToUse}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'xi-api-key': ELEVEN_LABS_API_KEY,
        },
        body: JSON.stringify({
            text: limitedText,
            model_id: ELEVEN_LABS_MODEL_ID,
        }),
    });

    if (!elevenLabsResponse.ok) {
        const errorBody = await elevenLabsResponse.text();
        return new Response(
            JSON.stringify({
                error: errorBody || 'ElevenLabs rejected the speech request.',
            }),
            {
                status: elevenLabsResponse.status,
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        );
    }

    const audioBuffer = await elevenLabsResponse.arrayBuffer();

    return new Response(audioBuffer, {
        status: 200,
        headers: {
            'Content-Type': 'audio/mpeg',
            'Access-Control-Allow-Origin': '*',
        },
    });
}
