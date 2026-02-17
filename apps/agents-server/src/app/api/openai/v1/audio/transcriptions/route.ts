import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getMetadata } from '@/src/database/getMetadata';

/**
 * Proxy endpoint for OpenAI Whisper transcription
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
        const model = formData.get('model') as string || 'whisper-1';
        const language = formData.get('language') as string | undefined;

        if (!file) {
            return NextResponse.json({ error: { message: 'No file provided' } }, { status: 400 });
        }

        const openai = new OpenAI({
            apiKey: openAiApiKey,
        });

        // Convert File to Buffer for OpenAI API
        const buffer = Buffer.from(await file.arrayBuffer());
        
        // Use the buffer with a filename and type
        const transcription = await openai.audio.transcriptions.create({
            file: await OpenAI.toFile(buffer, 'audio.wav', { type: 'audio/wav' }),
            model: model,
            language: language,
        });

        return NextResponse.json(transcription);
    } catch (error) {
        console.error('Transcription error:', error);
        return NextResponse.json(
            { error: { message: error instanceof Error ? error.message : 'Transcription failed' } },
            { status: 500 },
        );
    }
}
