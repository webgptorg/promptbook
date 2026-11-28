import { listCalendarActivity, listCalendarConnections } from '@/src/utils/calendars';
import { loadGoogleCalendarOAuthConfiguration } from '@/src/utils/googleCalendarOAuth';
import { resolveUseCalendarGoogleToken } from '@/src/utils/resolveUseCalendarGoogleToken';
import { NextResponse } from 'next/server';
import { resolveUserChatScope } from '../user-chats/resolveUserChatScope';

/**
 * Lists connected calendars and recent calendar activity for one agent.
 */
export async function GET(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    const { agentName: rawAgentName } = await params;
    const agentName = decodeURIComponent(rawAgentName);
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
        const limit = parsePositiveInteger(requestUrl.searchParams.get('activityLimit')) || 20;

        const [calendarConnections, calendarActivity, oauthConfiguration, googleAccessToken] = await Promise.all([
            listCalendarConnections({
                userId: scopeResult.scope.userId,
                agentPermanentId: scopeResult.scope.agentPermanentId,
                provider: 'google',
                includeDisconnected: true,
            }),
            listCalendarActivity({
                userId: scopeResult.scope.userId,
                agentPermanentId: scopeResult.scope.agentPermanentId,
                limit,
            }),
            loadGoogleCalendarOAuthConfiguration(),
            resolveUseCalendarGoogleToken({
                userId: scopeResult.scope.userId,
                agentPermanentId: scopeResult.scope.agentPermanentId,
            }),
        ]);

        return NextResponse.json({
            agentPermanentId: scopeResult.scope.agentPermanentId,
            oauth: {
                isConfigured: Boolean(oauthConfiguration),
                hasUsableToken: Boolean(googleAccessToken),
            },
            connections: calendarConnections,
            activity: calendarActivity,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to list calendar connections.' },
            { status: 500 },
        );
    }
}

/**
 * Parses one positive integer from query string input.
 */
function parsePositiveInteger(rawValue: string | null): number | null {
    const parsedValue = Number.parseInt(rawValue || '', 10);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        return null;
    }

    return parsedValue;
}
