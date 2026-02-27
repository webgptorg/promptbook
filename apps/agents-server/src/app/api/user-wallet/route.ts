import { NextResponse } from 'next/server';
import { isPrivateModeEnabledFromRequest } from '@/src/utils/privateMode';
import { resolveCurrentUserMemoryIdentity } from '@/src/utils/userMemory';
import {
    createUserWalletRecord,
    listUserWalletRecords,
    type CreateUserWalletRecordOptions,
    type UserWalletRecordType,
} from '@/src/utils/userWallet';

/**
 * Lists wallet records for current authenticated user.
 */
export async function GET(request: Request) {
    if (isPrivateModeEnabledFromRequest(request)) {
        return NextResponse.json({ error: 'Private mode is enabled.' }, { status: 403 });
    }

    const identity = await resolveCurrentUserMemoryIdentity();
    if (!identity) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const url = new URL(request.url);
        const agentPermanentId = url.searchParams.get('agentPermanentId') || undefined;
        const includeGlobal = url.searchParams.get('includeGlobal') !== 'false';
        const search = url.searchParams.get('search') || undefined;
        const recordType = (url.searchParams.get('recordType') as UserWalletRecordType | null) || undefined;
        const service = url.searchParams.get('service') || undefined;
        const key = url.searchParams.get('key') || undefined;
        const limitRaw = url.searchParams.get('limit');
        const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;

        const records = await listUserWalletRecords({
            userId: identity.userId,
            agentPermanentId,
            includeGlobal,
            search,
            recordType,
            service,
            key,
            limit: Number.isFinite(limit) ? limit : undefined,
        });

        return NextResponse.json(records);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 },
        );
    }
}

/**
 * Creates one wallet record for current authenticated user.
 */
export async function POST(request: Request) {
    if (isPrivateModeEnabledFromRequest(request)) {
        return NextResponse.json({ error: 'Private mode is enabled.' }, { status: 403 });
    }

    const identity = await resolveCurrentUserMemoryIdentity();
    if (!identity) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = (await request.json()) as Partial<CreateUserWalletRecordOptions>;
        const record = await createUserWalletRecord({
            userId: identity.userId,
            agentPermanentId: typeof body.agentPermanentId === 'string' ? body.agentPermanentId : null,
            isGlobal: body.isGlobal === true,
            recordType: body.recordType as CreateUserWalletRecordOptions['recordType'],
            service: typeof body.service === 'string' ? body.service : '',
            key: typeof body.key === 'string' ? body.key : undefined,
            username: typeof body.username === 'string' ? body.username : undefined,
            password: typeof body.password === 'string' ? body.password : undefined,
            secret: typeof body.secret === 'string' ? body.secret : undefined,
            cookies: typeof body.cookies === 'string' ? body.cookies : undefined,
        });

        return NextResponse.json(record, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create wallet record.' },
            { status: 400 },
        );
    }
}
