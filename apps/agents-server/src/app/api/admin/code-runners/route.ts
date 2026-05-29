import { NextResponse } from 'next/server';
import { isUserGlobalAdmin } from '@/src/utils/isUserGlobalAdmin';
import { readConfiguredCodeRunner, resolveCodeRunnerStatus } from '@/src/utils/codeRunnerConfiguration';
import {
    applyVpsCodeRunnerConfiguration,
    updateVpsEnvironmentVariables,
} from '@/src/utils/vpsConfiguration';

/**
 * Loads configured code-runner settings from the editable VPS environment.
 */
export async function GET() {
    if (!(await isUserGlobalAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const configuredCodeRunner = await readConfiguredCodeRunner();

        return NextResponse.json({
            ...configuredCodeRunner,
            status: await resolveCodeRunnerStatus(configuredCodeRunner.agent),
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to load code-runner configuration.' },
            { status: 500 },
        );
    }
}

/**
 * Updates code-runner environment variables.
 */
export async function PATCH(request: Request) {
    if (!(await isUserGlobalAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = (await request.json().catch(() => null)) as
            | {
                  readonly agent?: string;
                  readonly model?: string;
                  readonly thinkingLevel?: string;
                  readonly applyRuntimeConfiguration?: boolean;
              }
            | null;

        if (!body) {
            return NextResponse.json({ error: 'Code-runner payload is required.' }, { status: 400 });
        }

        await updateVpsEnvironmentVariables({
            PTBK_AGENT: body.agent || '',
            PTBK_MODEL: body.model || '',
            PTBK_THINKING_LEVEL: body.thinkingLevel || '',
        });

        const response = await GET();
        const payload = (await response.json()) as Record<string, unknown>;

        return NextResponse.json({
            ...payload,
            applyResult: body.applyRuntimeConfiguration ? await applyVpsCodeRunnerConfiguration() : null,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update code-runner configuration.' },
            { status: 500 },
        );
    }
}
