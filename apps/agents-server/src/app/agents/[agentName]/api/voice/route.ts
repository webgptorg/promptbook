import { getMetadataMap } from '@/src/database/getMetadata';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideOpenAiAgentKitExecutionToolsForServer } from '@/src/tools/$provideOpenAiAgentKitExecutionToolsForServer';
import { createChatHistoryRecorder } from '@/src/utils/chat/createChatHistoryRecorder';
import { composePromptParametersWithMemoryContext } from '@/src/utils/memoryRuntimeContext';
import {
    resolveMetaDisclaimerMarkdownFromAgentSource,
    resolveMetaDisclaimerStatusForUser,
} from '@/src/utils/metaDisclaimer';
import { resolveCurrentUserMemoryIdentity } from '@/src/utils/userMemory';
import { Agent, computeAgentHash } from '@promptbook-local/core';
import { serializeError } from '@promptbook-local/utils';
import { assertsError } from '../../../../../../../../src/errors/assertsError';
import { keepUnused } from '../../../../../../../../src/utils/organization/keepUnused';
import { respondIfClientVersionIsOutdated } from '../../../../../utils/clientVersionGuard';
import { textToSpeechText } from '../../../../../utils/textToSpeechText';
import { isPrivateModeEnabledFromRequest } from '@/src/utils/privateMode';

export const maxDuration = 300;

export async function OPTIONS(request: Request) {
    keepUnused(request);

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
    const metadata = await getMetadataMap([
        'IS_EXPERIMENTAL_VOICE_CALLING_ENABLED',
        'IS_EXPERIMENTAL_VOICE_TTS_STT_ENABLED',
    ]);
    const isVoiceCallingEnabled = metadata.IS_EXPERIMENTAL_VOICE_CALLING_ENABLED === 'true';
    const isVoiceTtsSttEnabled = metadata.IS_EXPERIMENTAL_VOICE_TTS_STT_ENABLED === 'true';

    if (!isVoiceCallingEnabled) {
        return new Response(JSON.stringify({ error: 'Voice calling is disabled on this server' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    if (!isVoiceTtsSttEnabled) {
        return new Response(
            JSON.stringify({ error: 'Text-to-speech / speech-to-text is disabled on this server' }),
            {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
            },
        );
    }

    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);

    const versionMismatchResponse = respondIfClientVersionIsOutdated(request, 'json');
    if (versionMismatchResponse) {
        return versionMismatchResponse;
    }

    // Note: Parse FormData for audio file
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const threadString = formData.get('thread') as string | null;
    const thread = threadString ? JSON.parse(threadString) : undefined;
    const isPrivateModeEnabled = isPrivateModeEnabledFromRequest(request);
    // const messageContext = formData.get('message') as string | null; // Optional text context or previous message?

    if (!audioFile) {
        return new Response(JSON.stringify({ error: 'No audio file provided' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const collection = await $provideAgentCollectionForServer();
        const agentPermanentId = await collection.getAgentPermanentId(agentName);
        const currentUserIdentity = await resolveCurrentUserMemoryIdentity();
        const agentSource = await collection.getAgentSource(agentName);
        const disclaimerMarkdown = resolveMetaDisclaimerMarkdownFromAgentSource(agentSource);

        if (disclaimerMarkdown) {
            if (!currentUserIdentity) {
                return new Response(
                    JSON.stringify({
                        error: 'You must accept the disclaimer before chatting with this agent',
                    }),
                    {
                        status: 403,
                        headers: { 'Content-Type': 'application/json' },
                    },
                );
            }

            const disclaimerStatus = await resolveMetaDisclaimerStatusForUser({
                userId: currentUserIdentity.userId,
                agentPermanentId,
                agentSource,
            });

            if (!disclaimerStatus.accepted) {
                return new Response(
                    JSON.stringify({
                        error: 'You must accept the disclaimer before chatting with this agent',
                    }),
                    {
                        status: 403,
                        headers: { 'Content-Type': 'application/json' },
                    },
                );
            }
        }

        const promptParameters = composePromptParametersWithMemoryContext({
            baseParameters: {},
            currentUserIdentity,
            agentPermanentId,
            agentName,
            isPrivateModeEnabled,
        });
        const openAiAgentKitExecutionTools = await $provideOpenAiAgentKitExecutionToolsForServer();
        const agent = new Agent({
            isVerbose: true,
            executionTools: {
                llm: openAiAgentKitExecutionTools,
            },
            agentSource,
            teacherAgent: null, // <- TODO: [🦋] DRY place to provide the teacher
        });

        // 1. Transcribe Audio (STT)
        const client = await openAiAgentKitExecutionTools.getClient();
        const transcription = await client.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
        });
        const message = transcription.text;

        // --- Common Chat Logic Start (TODO: Extract) ---

        const agentHash = computeAgentHash(agentSource);
        const recordChatHistoryMessage = await createChatHistoryRecorder({
            request,
            agentIdentifier: agentName,
            agentHash,
            source: 'AGENT_PAGE_CHAT',
            apiKey: null,
            isEnabled: !isPrivateModeEnabled,
        });

        // Identify and Record User Message
        const userMessageContent = {
            role: 'USER',
            content: message,
            isVoiceCall: true, // Mark as voice call
        };
        const userMessageHash = await recordChatHistoryMessage({
            message: userMessageContent,
            previousMessageHash: null,
        });

        // Call Agent
        const response = await agent.callChatModel({
            title: `Voice Chat with agent ${agentName}`,
            parameters: promptParameters,
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

        await recordChatHistoryMessage({
            message: agentMessageContent,
            previousMessageHash: userMessageHash,
            usage: response.usage,
        });

        // Learning
        if (!isPrivateModeEnabled) {
            const newAgentSource = agent.agentSource.value;
            if (newAgentSource !== agentSource) {
                await collection.updateAgentSource(agentName, newAgentSource);
            }
        }

        // --- Common Chat Logic End ---

        // 2. Synthesize Audio (TTS)
        const sanitizedSpeechText = textToSpeechText(response.content);
        const fallbackSpeechText = typeof response.content === 'string' ? response.content.trim() : '';

        const mp3 = await client.audio.speech.create({
            model: 'tts-1',
            voice: 'alloy',
            input: sanitizedSpeechText || fallbackSpeechText,
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
