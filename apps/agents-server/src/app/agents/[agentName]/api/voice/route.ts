import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { getMetadata } from '@/src/database/getMetadata';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideOpenAiAssistantExecutionToolsForServer } from '@/src/tools/$provideOpenAiAssistantExecutionToolsForServer';
import { Agent, computeAgentHash, PROMPTBOOK_ENGINE_VERSION } from '@promptbook-local/core';
import { computeHash, serializeError } from '@promptbook-local/utils';
import { assertsError } from '../../../../../../../../src/errors/assertsError';

export const maxDuration = 300;

export async function OPTIONS(request: Request) {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}

export async function POST(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    // Check if voice calling is enabled
    const isVoiceCallingEnabled = (await getMetadata('IS_EXPERIMENTAL_VOICE_CALLING_ENABLED')) === 'true';
    if (!isVoiceCallingEnabled) {
        return new Response(JSON.stringify({ error: 'Voice calling is disabled on this server' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);

    // Note: Parse FormData for audio file
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const threadString = formData.get('thread') as string | null;
    const thread = threadString ? JSON.parse(threadString) : undefined;
    const messageContext = formData.get('message') as string | null; // Optional text context or previous message?

    if (!audioFile) {
        return new Response(JSON.stringify({ error: 'No audio file provided' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const collection = await $provideAgentCollectionForServer();
        const openAiAssistantExecutionTools = await $provideOpenAiAssistantExecutionToolsForServer();
        const agentSource = await collection.getAgentSource(agentName);
        const agent = new Agent({
            isVerbose: true,
            executionTools: {
                llm: openAiAssistantExecutionTools,
            },
            agentSource,
        });

        // 1. Transcribe Audio (STT)
        const client = await openAiAssistantExecutionTools.getClient();
        const transcription = await client.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
        });
        const message = transcription.text;

        // --- Common Chat Logic Start (TODO: Extract) ---

        const agentHash = computeAgentHash(agentSource);
        const userAgent = request.headers.get('user-agent');
        const ip =
            request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            request.headers.get('x-client-ip');
        const language = request.headers.get('accept-language');
        const platform = userAgent ? userAgent.match(/\(([^)]+)\)/)?.[1] : undefined;

        // Identify and Record User Message
        const userMessageContent = {
            role: 'USER',
            content: message,
            isVoiceCall: true, // Mark as voice call
        };
        const supabase = $provideSupabaseForServer();
        await supabase.from(await $getTableName('ChatHistory')).insert({
            createdAt: new Date().toISOString(),
            messageHash: computeHash(userMessageContent),
            previousMessageHash: null,
            agentName,
            agentHash,
            message: userMessageContent,
            promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
            url: request.url,
            ip,
            userAgent,
            language,
            platform,
            source: 'AGENT_PAGE_CHAT',
            apiKey: null,
        });

        // Call Agent
        const response = await agent.callChatModel({
            title: `Voice Chat with agent ${agentName}`,
            parameters: {},
            modelRequirements: {
                modelVariant: 'CHAT',
            },
            content: message,
            thread,
        });

        const agentMessageContent = {
            role: 'MODEL',
            content: response.content,
            isVoiceCall: true,
        };

        // Record Agent Message
        await supabase.from(await $getTableName('ChatHistory')).insert({
            createdAt: new Date().toISOString(),
            messageHash: computeHash(agentMessageContent),
            previousMessageHash: computeHash(userMessageContent),
            agentName,
            agentHash,
            message: agentMessageContent,
            promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
            url: request.url,
            ip,
            userAgent,
            language,
            platform,
            source: 'AGENT_PAGE_CHAT',
            apiKey: null,
        });

        // Learning
        const newAgentSource = agent.agentSource.value;
        if (newAgentSource !== agentSource) {
            await collection.updateAgentSource(agentName, newAgentSource);
        }

        // --- Common Chat Logic End ---

        // 2. Synthesize Audio (TTS)
        const mp3 = await client.audio.speech.create({
            model: 'tts-1',
            voice: 'alloy',
            input: response.content,
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());
        const base64Audio = buffer.toString('base64');

        return new Response(
            JSON.stringify({
                userMessage: message,
                agentMessage: response.content,
                audio: base64Audio,
                audioFormat: 'mp3',
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            },
        );
    } catch (error) {
        assertsError(error);
        console.error(error);
        return new Response(JSON.stringify(serializeError(error), null, 4), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
