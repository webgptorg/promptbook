import { NextResponse } from 'next/server';
import { isUserGlobalAdmin } from '@/src/utils/isUserGlobalAdmin';
import {
    readVpsSelfUpdateOverview,
    rescheduleAutomaticVpsSelfUpdateScheduler,
    startVpsSelfUpdate,
    updateVpsSelfUpdateAutomaticConfiguration,
} from '@/src/utils/vpsSelfUpdate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Loads the current standalone VPS self-update overview for the super-admin UI.
 */
export async function GET() {
    if (!(await isUserGlobalAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        return NextResponse.json(await readVpsSelfUpdateOverview());
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to load the update overview.' },
            { status: 500 },
        );
    }
}

/**
 * Starts a detached standalone VPS self-update for the selected environment or arbitrary ref.
 */
export async function POST(request: Request) {
    if (!(await isUserGlobalAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = (await request.json().catch(() => null)) as {
            readonly environment?: string;
            readonly customRef?: string | null;
            readonly originRepositoryUrl?: string | null;
        } | null;

        if (!body?.environment || typeof body.environment !== 'string') {
            return NextResponse.json({ error: 'Update environment is required.' }, { status: 400 });
        }

        const overview = await startVpsSelfUpdate({
            environmentId: body.environment,
            customRef: body.customRef ?? null,
            originRepositoryUrl: body.originRepositoryUrl ?? null,
            trigger: 'manual',
        });

        return NextResponse.json(overview, { status: 202 });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to start the update.' },
            { status: 500 },
        );
    }
}

/**
 * Persists automatic standalone VPS self-update configuration.
 */
export async function PATCH(request: Request) {
    if (!(await isUserGlobalAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = (await request.json().catch(() => null)) as {
            readonly automaticConfiguration?: {
                readonly isEnabled?: boolean;
                readonly environment?: string;
                readonly cronExpression?: string;
            };
        } | null;
        const automaticConfiguration = body?.automaticConfiguration;

        if (
            !automaticConfiguration ||
            typeof automaticConfiguration.isEnabled !== 'boolean' ||
            typeof automaticConfiguration.environment !== 'string' ||
            typeof automaticConfiguration.cronExpression !== 'string'
        ) {
            return NextResponse.json({ error: 'Automatic self-update configuration is required.' }, { status: 400 });
        }

        await updateVpsSelfUpdateAutomaticConfiguration({
            isEnabled: automaticConfiguration.isEnabled,
            environmentId: automaticConfiguration.environment,
            cronExpression: automaticConfiguration.cronExpression,
        });
        rescheduleAutomaticVpsSelfUpdateScheduler();

        return NextResponse.json(await readVpsSelfUpdateOverview());
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to save automatic update configuration.' },
            { status: 500 },
        );
    }
}
