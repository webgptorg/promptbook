import type { ChatMessage } from '@promptbook-local/types';
import { NextResponse } from 'next/server';
import { createUserChat, createUserChatSummary, listUserChats } from '@/src/utils/userChat';
import { isPrivateModeEnabledFromRequest } from '@/src/utils/privateMode';
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
        return NextResponse.json({ error: 'Agent not found.' }, { status: 404 });
    }

    try {
        const requestUrl = new URL(request.url);
        const requestedChatId = normalizeOptionalString(requestUrl.searchParams.get('chat'));
        const chats = await listUserChats({
            userId: scopeResult.scope.userId,
            agentPermanentId: scopeResult.scope.agentPermanentId,
        });

        const activeChat =
            (requestedChatId ? chats.find((chat) => chat.id === requestedChatId) : null) ||
            chats[0] ||
            null;

        return NextResponse.json({
            chats: chats.map(createUserChatSummary),
            activeChatId: activeChat?.id || null,
            activeMessages: activeChat?.messages || [],
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
            chatId,
            messages,
        });

        return NextResponse.json(
            {
                chat: createUserChatSummary(chat),
                messages: chat.messages,
            },
            { status: 201 },
        );
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
