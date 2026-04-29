import { createCalendarActivity, disconnectCalendarConnection, listCalendarConnections } from '@/src/utils/calendars';
import { NextResponse } from 'next/server';
import { resolveUserChatScope } from '../../../user-chats/resolveUserChatScope';

/**
 * Disconnects one connected calendar from one agent.
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ agentName: string; connectionId: string }> },
) {
    const { agentName: rawAgentName, connectionId: rawConnectionId } = await params;
    const agentName = decodeURIComponent(rawAgentName);
    const connectionId = parsePositiveInteger(rawConnectionId);

    if (!connectionId) {
        return NextResponse.json({ error: 'Invalid connection id.' }, { status: 400 });
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
        const existingConnections = await listCalendarConnections({
            userId: scopeResult.scope.userId,
            agentPermanentId: scopeResult.scope.agentPermanentId,
            provider: 'google',
            includeDisconnected: true,
        });
        const existingConnection = existingConnections.find((connection) => connection.id === connectionId);
        if (!existingConnection) {
            return NextResponse.json({ error: 'Calendar connection not found.' }, { status: 404 });
        }

        const disconnectedConnection = await disconnectCalendarConnection({
            userId: scopeResult.scope.userId,
            connectionId: existingConnection.id,
        });
        if (!disconnectedConnection) {
            return NextResponse.json({ error: 'Calendar connection not found.' }, { status: 404 });
        }

        await createCalendarActivity({
            userId: scopeResult.scope.userId,
            agentPermanentId: scopeResult.scope.agentPermanentId,
            connectionId: disconnectedConnection.id,
            provider: disconnectedConnection.provider,
            operation: 'disconnect',
            calendarUrl: disconnectedConnection.calendarUrl,
            status: 'success',
            details: {
                disconnectedAt: disconnectedConnection.disconnectedAt,
            },
        });

        return NextResponse.json({
            success: true,
            connection: disconnectedConnection,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to disconnect calendar connection.' },
            { status: 500 },
        );
    }
}

/**
 * Parses one positive integer from path input.
 */
function parsePositiveInteger(rawValue: string): number | null {
    const parsedValue = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        return null;
    }

    return parsedValue;
}
