import { after, NextResponse } from 'next/server';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { isPrivateModeEnabledFromRequest } from '@/src/utils/privateMode';
import { resolveMetaDisclaimerStatusForUser } from '@/src/utils/metaDisclaimer';
import {
    appendQueuedUserChatTurn,
    createUserChatDetailPayload,
    getUserChat,
    getUserChatJobByClientMessageId,
    triggerUserChatJobWorker,
} from '@/src/utils/userChat';
import { normalizeChatAttachments } from '@promptbook-local/core';
import { resolveChatMessageValidationIssue } from '@/src/utils/chat/validateChatMessageContent';
import { resolveUserChatScope } from '../../resolveUserChatScope';

/**
 * Enqueues one durable user chat turn and immediately returns canonical chat state.
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ agentName: string; chatId: string }> },
) {
    if (isPrivateModeEnabledFromRequest(request)) {
        return NextResponse.json({ error: 'Private mode is enabled.' }, { status: 403 });
    }

    const { agentName: rawAgentName, chatId: rawChatId } = await params;
    const agentName = decodeURIComponent(rawAgentName);
    const chatId = decodeURIComponent(rawChatId);
    const scopeResult = await resolveUserChatScope(agentName);

    if (!scopeResult.ok) {
        if (scopeResult.error === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Agent not found.' }, { status: 404 });
    }

    try {
        const body = (await request.json().catch(() => ({}))) as {
            clientMessageId?: unknown;
            message?: unknown;
            attachments?: unknown;
            parameters?: unknown;
        };
        const clientMessageId = normalizeRequiredNonEmptyString(body.clientMessageId);
        if (!clientMessageId) {
            return NextResponse.json({ error: 'clientMessageId is required.' }, { status: 400 });
        }

        const messageContent = normalizeMessageContent(body.message);
        if (messageContent === null) {
            return NextResponse.json({ error: 'message must be a string.' }, { status: 400 });
        }
        const messageIssue = resolveChatMessageValidationIssue(messageContent);
        if (messageIssue) {
            return NextResponse.json({ error: messageIssue.message }, { status: messageIssue.status });
        }

        const attachments = normalizeChatAttachments(body.attachments);
        if (messageContent.trim().length === 0 && attachments.length === 0) {
            return NextResponse.json({ error: 'Message must contain text or attachments.' }, { status: 400 });
        }

        const parameters = normalizePromptParameters(body.parameters);
        const existingChat = await getUserChat({
            userId: scopeResult.scope.userId,
            agentPermanentId: scopeResult.scope.agentPermanentId,
            chatId,
        });

        if (!existingChat) {
            return NextResponse.json({ error: 'Chat not found.' }, { status: 404 });
        }

        const existingJob = await getUserChatJobByClientMessageId({
            userId: scopeResult.scope.userId,
            agentPermanentId: scopeResult.scope.agentPermanentId,
            chatId,
            clientMessageId,
        });

        if (existingJob) {
            return NextResponse.json({
                ...(await createUserChatDetailPayload(existingChat)),
                job: existingJob,
            });
        }

        const collection = await $provideAgentCollectionForServer();
        const agentSource = await collection.getAgentSource(scopeResult.scope.agentPermanentId);
        const disclaimerStatus = await resolveMetaDisclaimerStatusForUser({
            userId: scopeResult.scope.userId,
            agentPermanentId: scopeResult.scope.agentPermanentId,
            agentSource,
        });

        if (!disclaimerStatus.accepted) {
            return NextResponse.json(
                { error: 'You must accept the disclaimer before chatting with this agent.' },
                { status: 403 },
            );
        }

        const enqueuedTurn = await appendQueuedUserChatTurn({
            userId: scopeResult.scope.userId,
            agentPermanentId: scopeResult.scope.agentPermanentId,
            chatId,
            clientMessageId,
            messageContent,
            attachments,
            parameters,
        }).catch(async (error) => {
            if (isDuplicateUserChatJobError(error)) {
                const duplicateJob = await getUserChatJobByClientMessageId({
                    userId: scopeResult.scope.userId,
                    agentPermanentId: scopeResult.scope.agentPermanentId,
                    chatId,
                    clientMessageId,
                });

                if (duplicateJob) {
                    return {
                        chat: (await getUserChat({
                            userId: scopeResult.scope.userId,
                            agentPermanentId: scopeResult.scope.agentPermanentId,
                            chatId,
                        }))!,
                        job: duplicateJob,
                    };
                }
            }

            throw error;
        });

        after(() =>
            triggerUserChatJobWorker({
                origin: new URL(request.url).origin,
                preferredJobId: enqueuedTurn.job.id,
            }).catch((error) => console.error('[user-chat] Failed to trigger durable worker', error)),
        );

        return NextResponse.json(
            {
                ...(await createUserChatDetailPayload(enqueuedTurn.chat)),
                job: enqueuedTurn.job,
            },
            { status: 202 },
        );
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to enqueue chat message.' },
            { status: 500 },
        );
    }
}

/**
 * Normalizes one required non-empty string request field.
 *
 * @private route helper
 */
function normalizeRequiredNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

/**
 * Normalizes message input so attachments-only sends can preserve blank text.
 *
 * @private route helper
 */
function normalizeMessageContent(value: unknown): string | null {
    if (value === undefined || value === null) {
        return '';
    }

    if (typeof value !== 'string') {
        return null;
    }

    return value;
}

/**
 * Normalizes prompt-parameter payloads persisted with one queued job.
 *
 * @private route helper
 */
function normalizePromptParameters(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {};
    }

    return value as Record<string, unknown>;
}

/**
 * Detects duplicate durable-job enqueue failures so retries stay idempotent.
 *
 * @private route helper
 */
function isDuplicateUserChatJobError(error: unknown): boolean {
    return error instanceof Error && error.name === 'UserChatJobDuplicateError';
}
