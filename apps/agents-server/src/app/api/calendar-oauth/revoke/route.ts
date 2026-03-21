import { createCalendarActivity, disconnectCalendarConnection, listCalendarConnections } from '@/src/utils/calendars';
import { revokeGoogleCalendarOAuthToken } from '@/src/utils/googleCalendarOAuth';
import { resolveCurrentUserMemoryIdentity } from '@/src/utils/userMemory';
import {
    deleteUserWalletRecord,
    listUserWalletRecords,
    resolveUseCalendarGoogleOAuthTokenPayloadFromWallet,
    USE_CALENDAR_GOOGLE_OAUTH_WALLET_KEY,
    USE_CALENDAR_GOOGLE_WALLET_SERVICE,
} from '@/src/utils/userWallet';
import { NextResponse } from 'next/server';

/**
 * Revokes Google Calendar OAuth tokens and disconnects calendar connections for current user.
 */
export async function POST(request: Request) {
    const identity = await resolveCurrentUserMemoryIdentity();
    if (!identity) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
        agentPermanentId?: unknown;
        connectionId?: unknown;
    } | null;
    const agentPermanentId = normalizeOptionalText(body?.agentPermanentId);
    const connectionId =
        typeof body?.connectionId === 'number' && Number.isFinite(body.connectionId)
            ? Math.floor(body.connectionId)
            : null;

    if (!agentPermanentId && !connectionId) {
        return NextResponse.json(
            { error: 'Either `agentPermanentId` or `connectionId` must be provided.' },
            { status: 400 },
        );
    }

    try {
        const oauthPayload = await resolveUseCalendarGoogleOAuthTokenPayloadFromWallet({
            userId: identity.userId,
            agentPermanentId: agentPermanentId || undefined,
        });
        let revokedToken = false;

        if (oauthPayload?.refreshToken) {
            await revokeGoogleCalendarOAuthToken(oauthPayload.refreshToken).catch(() => undefined);
            revokedToken = true;
        }
        if (oauthPayload?.accessToken) {
            await revokeGoogleCalendarOAuthToken(oauthPayload.accessToken).catch(() => undefined);
            revokedToken = true;
        }

        const allConnections = await listCalendarConnections({
            userId: identity.userId,
            ...(agentPermanentId ? { agentPermanentId } : {}),
            provider: 'google',
        });
        const connectionsToDisconnect = connectionId
            ? allConnections.filter((connection) => connection.id === connectionId)
            : allConnections;

        let disconnectedConnections = 0;
        for (const connection of connectionsToDisconnect) {
            const disconnectedConnection = await disconnectCalendarConnection({
                userId: identity.userId,
                connectionId: connection.id,
            });
            if (!disconnectedConnection) {
                continue;
            }

            disconnectedConnections += 1;
            await createCalendarActivity({
                userId: identity.userId,
                agentPermanentId: disconnectedConnection.agentPermanentId,
                connectionId: disconnectedConnection.id,
                provider: disconnectedConnection.provider,
                operation: 'oauth_disconnect',
                calendarUrl: disconnectedConnection.calendarUrl,
                status: 'success',
                details: {
                    revokedToken,
                },
            });
        }

        const walletRecords = await listUserWalletRecords({
            userId: identity.userId,
            ...(agentPermanentId ? { agentPermanentId } : {}),
            includeGlobal: true,
            service: USE_CALENDAR_GOOGLE_WALLET_SERVICE,
            key: USE_CALENDAR_GOOGLE_OAUTH_WALLET_KEY,
        });
        let deletedWalletRecords = 0;
        for (const walletRecord of walletRecords) {
            const deleted = await deleteUserWalletRecord({
                userId: identity.userId,
                walletId: walletRecord.id,
            });
            if (deleted) {
                deletedWalletRecords += 1;
            }
        }

        return NextResponse.json({
            success: true,
            revokedToken,
            disconnectedConnections,
            deletedWalletRecords,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to revoke Calendar OAuth connection.' },
            { status: 500 },
        );
    }
}

/**
 * Normalizes optional textual values.
 */
function normalizeOptionalText(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmedValue = value.trim();
    return trimmedValue || null;
}

