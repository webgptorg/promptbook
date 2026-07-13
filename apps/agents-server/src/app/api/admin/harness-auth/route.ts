import { NextResponse } from 'next/server';
import { isUserGlobalAdmin } from '@/src/utils/isUserGlobalAdmin';
import { readConfiguredHarness, resolveHarnessStatus } from '@/src/utils/harnessConfiguration';
import {
    applyVpsHarnessConfiguration,
    updateVpsEnvironmentVariables,
} from '@/src/utils/vpsConfiguration';

/**
 * Loads configured harness settings from the editable VPS environment.
 */
export async function GET() {
    if (!(await isUserGlobalAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const configuredHarness = await readConfiguredHarness();

        return NextResponse.json({
            ...configuredHarness,
            status: await resolveHarnessStatus(configuredHarness.harness),
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to load harness configuration.' },
            { status: 500 },
        );
    }
}

/**
 * Updates harness environment variables.
 */
export async function PATCH(request: Request) {
    if (!(await isUserGlobalAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = (await request.json().catch(() => null)) as
            | {
                  readonly harness?: string;
                  readonly model?: string;
                  readonly thinkingLevel?: string;
                  readonly applyRuntimeConfiguration?: boolean;
              }
            | null;

        if (!body) {
            return NextResponse.json({ error: 'Harness payload is required.' }, { status: 400 });
        }

        await updateVpsEnvironmentVariables({
            PTBK_HARNESS: body.harness || '',
            PTBK_MODEL: body.model || '',
            PTBK_THINKING_LEVEL: body.thinkingLevel || '',
        });

        const response = await GET();
        const payload = (await response.json()) as Record<string, unknown>;

        return NextResponse.json({
            ...payload,
            applyResult: body.applyRuntimeConfiguration ? await applyVpsHarnessConfiguration() : null,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update harness configuration.' },
            { status: 500 },
        );
    }
}
