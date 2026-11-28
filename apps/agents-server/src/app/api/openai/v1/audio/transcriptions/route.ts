import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { spaceTrim } from 'spacetrim';
import { getMetadata } from '@/src/database/getMetadata';
import { guardPaidApiRequest } from '@/src/utils/paidApiRequestGuard';

/**
 * Fallback file name used when the uploaded blob does not carry one.
 */
const DEFAULT_AUDIO_TRANSCRIPTION_FILE_NAME = 'speech-recording.webm';

/**
 * Preferred transcription models from highest to broadest compatibility.
 */
const DEFAULT_AUDIO_TRANSCRIPTION_MODEL_PRIORITY = ['gpt-4o-transcribe', 'gpt-4o-mini-transcribe', 'whisper-1'] as const;

/**
 * Allowlist of model identifiers accepted from the caller.
 *
 * Caller-supplied model names are forwarded to the paid OpenAI API, so we
 * validate them against a fixed allowlist to prevent attackers from forcing
 * the server to call expensive or experimental models that are not part of
 * the supported transcription stack.
 */
const ALLOWED_AUDIO_TRANSCRIPTION_MODELS = new Set<string>(DEFAULT_AUDIO_TRANSCRIPTION_MODEL_PRIORITY);

/**
 * Maximum upload size that will be forwarded to OpenAI transcription.
 *
 * OpenAI's own limit is 25 MB; mirroring it here ensures we fail fast with a
 * clear error before paying for an upload that the provider would reject.
 */
const MAX_AUDIO_TRANSCRIPTION_FILE_SIZE_BYTES = 25 * 1024 * 1024;

/**
 * Pattern matching ISO-639-1 language codes that OpenAI transcription accepts.
 */
const ISO_639_1_LANGUAGE_CODE_PATTERN = /^[a-z]{2}$/u;

/**
 * Maximum prompt length forwarded as transcription context.
 *
 * OpenAI rejects prompts longer than 224 tokens; we keep a conservative
 * character cap that comfortably stays under that limit while preventing
 * attackers from inflating request size.
 */
const MAX_AUDIO_TRANSCRIPTION_PROMPT_LENGTH = 800;

/**
 * Proxy endpoint for OpenAI audio transcription
 *
 * Note: This endpoint is used to avoid exposing the OpenAI API key on the client.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const openAiApiKey = process.env.OPENAI_API_KEY;

        if (!openAiApiKey) {
            return NextResponse.json({ error: { message: 'OPENAI_API_KEY is not set on the server' } }, { status: 500 });
        }

        const isSpeechEnabled = (await getMetadata('IS_EXPERIMENTAL_VOICE_TTS_STT_ENABLED')) === 'true';
        if (!isSpeechEnabled) {
            return NextResponse.json(
                { error: { message: 'Text-to-speech / speech-to-text is disabled on this server' } },
                { status: 403 },
            );
        }

        const guard = await guardPaidApiRequest(request, 'AUDIO_TRANSCRIPTION');
        if (!guard.ok) {
            return guard.response;
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const requestedModel = normalizeFormDataStringValue(formData.get('model'));
        const language = resolveAudioTranscriptionLanguage(formData.get('language'));
        const prompt = resolveAudioTranscriptionPrompt(formData.get('prompt'));
        const temperature = resolveAudioTranscriptionTemperature(formData.get('temperature'));

        if (!file) {
            return NextResponse.json({ error: { message: 'No file provided' } }, { status: 400 });
        }

        if (file.size > MAX_AUDIO_TRANSCRIPTION_FILE_SIZE_BYTES) {
            return NextResponse.json(
                {
                    error: {
                        message: spaceTrim(`
                            Uploaded audio file is too large.

                            **Maximum allowed size:** ${Math.round(
                                MAX_AUDIO_TRANSCRIPTION_FILE_SIZE_BYTES / (1024 * 1024),
                            )} MB
                            **Received:** ${(file.size / (1024 * 1024)).toFixed(2)} MB
                        `),
                    },
                },
                { status: 413 },
            );
        }

        if (requestedModel !== undefined && !ALLOWED_AUDIO_TRANSCRIPTION_MODELS.has(requestedModel)) {
            return NextResponse.json(
                {
                    error: {
                        message: spaceTrim(`
                            Requested transcription model is not allowed.

                            **Allowed models:** ${Array.from(ALLOWED_AUDIO_TRANSCRIPTION_MODELS).join(', ')}
                        `),
                    },
                },
                { status: 400 },
            );
        }

        const openai = new OpenAI({
            apiKey: openAiApiKey,
        });

        // Convert File to Buffer for OpenAI API
        const buffer = Buffer.from(await file.arrayBuffer());

        const fileName = file.name || DEFAULT_AUDIO_TRANSCRIPTION_FILE_NAME;
        const fileType = normalizeFormDataStringValue(file.type);
        let lastError: unknown = undefined;

        for (const transcriptionModel of resolveAudioTranscriptionModelPriority(requestedModel)) {
            try {
                const transcription = await openai.audio.transcriptions.create({
                    file: await OpenAI.toFile(buffer, fileName, fileType ? { type: fileType } : undefined),
                    model: transcriptionModel,
                    language,
                    prompt,
                    temperature,
                });

                return NextResponse.json(transcription);
            } catch (error) {
                lastError = error;
            }
        }

        throw lastError || new Error('Transcription failed');
    } catch (error) {
        console.error('Transcription error:', error);
        return NextResponse.json(
            { error: { message: error instanceof Error ? error.message : 'Transcription failed' } },
            { status: 500 },
        );
    }
}

/**
 * Resolves model fallback priority for one transcription request.
 */
function resolveAudioTranscriptionModelPriority(requestedModel: string | undefined): ReadonlyArray<string> {
    if (!requestedModel) {
        return DEFAULT_AUDIO_TRANSCRIPTION_MODEL_PRIORITY;
    }

    return [requestedModel, ...DEFAULT_AUDIO_TRANSCRIPTION_MODEL_PRIORITY.filter((model) => model !== requestedModel)];
}

/**
 * Normalizes optional string values received through multipart form data.
 */
function normalizeFormDataStringValue(value: FormDataEntryValue | null): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalizedValue = value.trim();
    if (!normalizedValue) {
        return undefined;
    }

    return normalizedValue;
}

/**
 * Validates the caller-supplied language hint against ISO-639-1.
 *
 * Forwarding arbitrary `language` strings to OpenAI is harmless cost-wise but
 * widens the attack surface — invalid values can trigger model retries that
 * silently inflate the bill. We mirror the documented constraint and drop
 * anything that does not match.
 */
function resolveAudioTranscriptionLanguage(value: FormDataEntryValue | null): string | undefined {
    const normalizedValue = normalizeFormDataStringValue(value);
    if (!normalizedValue) {
        return undefined;
    }

    if (!ISO_639_1_LANGUAGE_CODE_PATTERN.test(normalizedValue)) {
        return undefined;
    }

    return normalizedValue.toLowerCase();
}

/**
 * Validates and truncates the optional transcription prompt before sending it to OpenAI.
 */
function resolveAudioTranscriptionPrompt(value: FormDataEntryValue | null): string | undefined {
    const normalizedValue = normalizeFormDataStringValue(value);
    if (!normalizedValue) {
        return undefined;
    }

    if (normalizedValue.length <= MAX_AUDIO_TRANSCRIPTION_PROMPT_LENGTH) {
        return normalizedValue;
    }

    return normalizedValue.slice(0, MAX_AUDIO_TRANSCRIPTION_PROMPT_LENGTH);
}

/**
 * Parses optional transcription temperature from multipart form data.
 */
function resolveAudioTranscriptionTemperature(value: FormDataEntryValue | null): number | undefined {
    const normalizedValue = normalizeFormDataStringValue(value);
    if (!normalizedValue) {
        return undefined;
    }

    const parsedTemperature = Number(normalizedValue);
    if (Number.isNaN(parsedTemperature)) {
        return undefined;
    }

    return parsedTemperature;
}
