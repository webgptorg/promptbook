import { NextRequest } from 'next/server';
import { spaceTrim } from 'spacetrim';
import { respondIfClientVersionIsOutdated } from '../../../../utils/clientVersionGuard';
import { getMetadata } from '@/src/database/getMetadata';
import { guardPaidApiRequest } from '@/src/utils/paidApiRequestGuard';
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
 * Pattern matching valid ElevenLabs voice identifiers.
 *
 * ElevenLabs voice IDs are 20-character alphanumeric strings (e.g.
 * `21m00Tcm4TlvDq8ikWAM`). Validating with a strict allowlist prevents an
 * attacker from injecting arbitrary path segments into the upstream URL
 * (which is built by string interpolation below) and stops requests for
 * unknown ids that would still bill our ElevenLabs account.
 *
 * @private
 */
const ELEVEN_LABS_VOICE_ID_PATTERN = /^[A-Za-z0-9]{15,40}$/u;

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
export async function POST(request: NextRequest) {
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

    const guard = await guardPaidApiRequest(request, 'TEXT_TO_SPEECH');
    if (!guard.ok) {
        return guard.response;
    }

    const payload = (await request.json().catch(() => null)) as { text?: string; voiceId?: string } | null;
    const rawText = (payload?.text?.toString() ?? '').trim();
    const requestedVoiceId = payload?.voiceId?.toString().trim();
    const voiceIdToUse = resolveValidatedVoiceId(requestedVoiceId);

    if (voiceIdToUse === null) {
        return new Response(
            JSON.stringify({
                error: spaceTrim(`
                    Invalid \`voiceId\`.

                    ElevenLabs voice ids must be 15–40 alphanumeric characters.
                `),
            }),
            {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            },
        );
    }

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

/**
 * Validates the caller-supplied voice id and falls back to the configured default.
 *
 * Returns `null` if the caller provided a voice id that does not match the
 * ElevenLabs format. The default value comes from a trusted environment
 * variable, so it is forwarded as-is without re-validation.
 *
 * @private internal helper of `POST /api/elevenlabs/tts`
 */
function resolveValidatedVoiceId(requestedVoiceId: string | undefined): string | null {
    if (!requestedVoiceId) {
        return ELEVEN_LABS_VOICE_ID;
    }

    if (!ELEVEN_LABS_VOICE_ID_PATTERN.test(requestedVoiceId)) {
        return null;
    }

    return requestedVoiceId;
}
