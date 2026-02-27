import { NextResponse } from 'next/server';
import { isPrivateModeEnabledFromRequest } from '@/src/utils/privateMode';
import { resolveCurrentUserMemoryIdentity } from '@/src/utils/userMemory';
import { deleteUserWalletRecord, updateUserWalletRecord } from '@/src/utils/userWallet';

/**
 * Parses numeric wallet id from route params.
 */
function parseWalletId(rawValue: string): number | null {
    const parsed = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }
    return parsed;
}

/**
 * Updates one wallet record for current authenticated user.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ walletId: string }> }) {
    if (isPrivateModeEnabledFromRequest(request)) {
        return NextResponse.json({ error: 'Private mode is enabled.' }, { status: 403 });
    }

    const identity = await resolveCurrentUserMemoryIdentity();
    if (!identity) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { walletId: rawWalletId } = await params;
    const walletId = parseWalletId(rawWalletId);
    if (!walletId) {
        return NextResponse.json({ error: 'Invalid wallet id.' }, { status: 400 });
    }

    try {
        const body = (await request.json()) as {
            recordType?: unknown;
            service?: unknown;
            key?: unknown;
            username?: unknown;
            password?: unknown;
            secret?: unknown;
            cookies?: unknown;
            isGlobal?: unknown;
            agentPermanentId?: unknown;
        };

        const record = await updateUserWalletRecord({
            userId: identity.userId,
            walletId,
            recordType: body.recordType as 'USERNAME_PASSWORD' | 'SESSION_COOKIE' | 'ACCESS_TOKEN',
            service: typeof body.service === 'string' ? body.service : '',
            key: typeof body.key === 'string' ? body.key : undefined,
            username: typeof body.username === 'string' ? body.username : undefined,
            password: typeof body.password === 'string' ? body.password : undefined,
            secret: typeof body.secret === 'string' ? body.secret : undefined,
            cookies: typeof body.cookies === 'string' ? body.cookies : undefined,
            isGlobal: body.isGlobal === true,
            agentPermanentId: typeof body.agentPermanentId === 'string' ? body.agentPermanentId : null,
        });

        return NextResponse.json(record);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update wallet record.' },
            { status: 400 },
        );
    }
}

/**
 * Deletes one wallet record for current authenticated user.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ walletId: string }> }) {
    if (isPrivateModeEnabledFromRequest(request)) {
        return NextResponse.json({ error: 'Private mode is enabled.' }, { status: 403 });
    }

    const identity = await resolveCurrentUserMemoryIdentity();
    if (!identity) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { walletId: rawWalletId } = await params;
    const walletId = parseWalletId(rawWalletId);
    if (!walletId) {
        return NextResponse.json({ error: 'Invalid wallet id.' }, { status: 400 });
    }

    try {
        const deleted = await deleteUserWalletRecord({
            userId: identity.userId,
            walletId,
        });

        if (!deleted) {
            return NextResponse.json({ error: 'Wallet record not found.' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete wallet record.' },
            { status: 500 },
        );
    }
}
