import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getMetadata } from '@/src/database/getMetadata';

/**
 * Fallback file name used when the uploaded blob does not carry one.
 */
const DEFAULT_AUDIO_TRANSCRIPTION_FILE_NAME = 'speech-recording.webm';

/**
 * Preferred transcription models from highest to broadest compatibility.
 */
const DEFAULT_AUDIO_TRANSCRIPTION_MODEL_PRIORITY = ['gpt-4o-transcribe', 'gpt-4o-mini-transcribe', 'whisper-1'] as const;

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

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const requestedModel = normalizeFormDataStringValue(formData.get('model'));
        const language = normalizeFormDataStringValue(formData.get('language'));
        const prompt = normalizeFormDataStringValue(formData.get('prompt'));
        const temperature = resolveAudioTranscriptionTemperature(formData.get('temperature'));

        if (!file) {
            return NextResponse.json({ error: { message: 'No file provided' } }, { status: 400 });
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
