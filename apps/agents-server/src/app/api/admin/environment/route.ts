import { NextResponse } from 'next/server';
import {
    applyVpsRuntimeConfiguration,
    listVpsEnvironmentVariables,
    updateVpsEnvironmentVariables,
} from '@/src/utils/vpsConfiguration';
import { isUserAdmin } from '@/src/utils/isUserAdmin';
import { isUserGlobalAdmin } from '@/src/utils/isUserGlobalAdmin';

/**
 * Loads `.env` variables visible in the admin UI.
 */
export async function GET() {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        return NextResponse.json({
            ...(await listVpsEnvironmentVariables()),
            canEdit: await isUserGlobalAdmin(),
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to load environment variables.' },
            { status: 500 },
        );
    }
}

/**
 * Persists editable `.env` variables and optionally reapplies VPS runtime configuration.
 */
export async function PATCH(request: Request) {
    if (!(await isUserGlobalAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = (await request.json().catch(() => null)) as
            | {
                  readonly variables?: Record<string, string>;
                  readonly applyRuntimeConfiguration?: boolean;
              }
            | null;

        if (!body || typeof body.variables !== 'object' || body.variables === null) {
            return NextResponse.json({ error: 'Variables payload is required.' }, { status: 400 });
        }

        const snapshot = await updateVpsEnvironmentVariables(body.variables);
        const applyResult = body.applyRuntimeConfiguration ? await applyVpsRuntimeConfiguration() : null;

        return NextResponse.json({
            ...snapshot,
            canEdit: true,
            applyResult,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update environment variables.' },
            { status: 500 },
        );
    }
}
