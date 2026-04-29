import { isPrivateModeEnabledFromRequest } from '@/src/utils/privateMode';
import {
    createUserChat,
    createUserChatDetailPayload,
    createUserChatSummaryFromSeed,
    getUserChat,
    listUserChatJobActivityCounts,
    listUserChatSummarySeeds,
    USER_CHAT_SOURCES,
} from '@/src/utils/userChat';
import { listUserChatTimeoutActivities } from '@/src/utils/userChatTimeout/userChatTimeoutStore';
import type { ChatMessage } from '@promptbook-local/types';
import { NextResponse } from 'next/server';
import { resolveUserChatScope } from './resolveUserChatScope';

/**
 * Lists user chats for one agent and returns active chat payload.
 */
export async function GET(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    const { agentName: rawAgentName } = await params;
    const agentName = decodeURIComponent(rawAgentName);
    if (isPrivateModeEnabledFromRequest(request)) {
        return NextResponse.json({ error: 'Private mode is enabled.' }, { status: 403 });
    }
    const scopeResult = await resolveUserChatScope(agentName);

    if (!scopeResult.ok) {
        if (scopeResult.error === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (scopeResult.error === 'FORBIDDEN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.json({ error: 'Agent not found.' }, { status: 404 });
    }

    try {
        const requestUrl = new URL(request.url);
        const requestedChatId = normalizeOptionalString(requestUrl.searchParams.get('chat'));
        const showExternalChats = normalizeBooleanFlag(requestUrl.searchParams.get('showExternalChats'));
        const chatSummarySeeds = await listUserChatSummarySeeds({
            userId: scopeResult.scope.userId,
            viewerIsAdmin: scopeResult.scope.viewerIsAdmin,
            agentPermanentId: scopeResult.scope.agentPermanentId,
            includeExternalChats: showExternalChats,
        });
        const activityUserId =
            scopeResult.scope.viewerIsAdmin && showExternalChats ? undefined : scopeResult.scope.userId;
        const [timeoutActivities, jobActivityCounts] = await Promise.all([
            listUserChatTimeoutActivities({
                userId: activityUserId,
                agentPermanentId: scopeResult.scope.agentPermanentId,
                chatIds: chatSummarySeeds.map((chat) => chat.id),
            }),
            listUserChatJobActivityCounts({
                userId: activityUserId,
                agentPermanentId: scopeResult.scope.agentPermanentId,
                chatIds: chatSummarySeeds.map((chat) => chat.id),
            }),
        ]);

        const activeChatSummarySeed =
            (requestedChatId ? chatSummarySeeds.find((chat) => chat.id === requestedChatId) : null) ||
            chatSummarySeeds[0] ||
            null;
        const activeChat = activeChatSummarySeed
            ? await getUserChat({
                  userId: scopeResult.scope.userId,
                  viewerIsAdmin: scopeResult.scope.viewerIsAdmin,
                  agentPermanentId: scopeResult.scope.agentPermanentId,
                  chatId: activeChatSummarySeed.id,
              })
            : null;
        const activeChatDetail = activeChat ? await createUserChatDetailPayload(activeChat) : null;
        const chatSummaries = chatSummarySeeds.map((chat) =>
            createUserChatSummaryFromSeed(chat, {
                timeoutActivity: timeoutActivities[chat.id],
                activeJobCount: jobActivityCounts[chat.id],
            }),
        );

        return NextResponse.json({
            chats: activeChatDetail ? replaceChatSummary(chatSummaries, activeChatDetail.chat) : chatSummaries,
            activeChatId: activeChatDetail?.chat.id || null,
            activeMessages: activeChatDetail?.messages || [],
            activeDraftMessage: activeChatDetail?.draftMessage || null,
            activeJobs: activeChatDetail?.activeJobs || [],
            activeTimeouts: activeChatDetail?.activeTimeouts || [],
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to load user chats.' },
            { status: 500 },
        );
    }
}

/**
 * Creates a new chat for current user and agent.
 */
export async function POST(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    const { agentName: rawAgentName } = await params;
    const agentName = decodeURIComponent(rawAgentName);
    if (isPrivateModeEnabledFromRequest(request)) {
        return NextResponse.json({ error: 'Private mode is enabled.' }, { status: 403 });
    }
    const scopeResult = await resolveUserChatScope(agentName);

    if (!scopeResult.ok) {
        if (scopeResult.error === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (scopeResult.error === 'FORBIDDEN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.json({ error: 'Agent not found.' }, { status: 404 });
    }

    try {
        const body = (await request.json().catch(() => ({}))) as {
            chatId?: unknown;
            messages?: unknown;
        };
        const chatId = typeof body.chatId === 'string' ? normalizeOptionalString(body.chatId) : undefined;
        const messages = Array.isArray(body.messages) ? (body.messages as Array<ChatMessage>) : [];

        const chat = await createUserChat({
            userId: scopeResult.scope.userId,
            agentPermanentId: scopeResult.scope.agentPermanentId,
            source: USER_CHAT_SOURCES.WEB_UI,
            chatId,
            messages,
        });

        return NextResponse.json(await createUserChatDetailPayload(chat), { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create chat.' },
            { status: 400 },
        );
    }
}

/**
 * Normalizes optional string query/body fields.
 */
function normalizeOptionalString(value: string | null | undefined): string | undefined {
    if (!value) {
        return undefined;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
}

/**
 * Parses one permissive boolean query flag.
 */
function normalizeBooleanFlag(value: string | null): boolean {
    return value === '1' || value === 'true' || value === '';
}

/**
 * Replaces one summary inside the list with a refreshed canonical version.
 */
function replaceChatSummary(
    chats: ReadonlyArray<ReturnType<typeof createUserChatSummaryFromSeed>>,
    refreshedChat: ReturnType<typeof createUserChatSummaryFromSeed>,
): Array<ReturnType<typeof createUserChatSummaryFromSeed>> {
    return chats.map((chat) => (chat.id === refreshedChat.id ? refreshedChat : chat));
}
