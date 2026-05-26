import { execFile } from 'child_process';
import { promisify } from 'util';
import { NextResponse } from 'next/server';
import { isUserGlobalAdmin } from '@/src/utils/isUserGlobalAdmin';
import {
    applyVpsCodeRunnerConfiguration,
    listVpsEnvironmentVariables,
    updateVpsEnvironmentVariables,
} from '@/src/utils/vpsConfiguration';

const execFileAsync = promisify(execFile);

/**
 * Loads configured code-runner settings from the editable VPS environment.
 */
export async function GET() {
    if (!(await isUserGlobalAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const snapshot = await listVpsEnvironmentVariables();
        const environmentByKey = Object.fromEntries(
            snapshot.variables.map((variable) => [variable.key, variable.value]),
        ) as Record<string, string>;

        return NextResponse.json({
            agent: environmentByKey.PTBK_AGENT || process.env.PTBK_AGENT || 'github-copilot',
            model: environmentByKey.PTBK_MODEL || process.env.PTBK_MODEL || 'gpt-5.4',
            thinkingLevel: environmentByKey.PTBK_THINKING_LEVEL || process.env.PTBK_THINKING_LEVEL || 'xhigh',
            status: await resolveRunnerStatus(environmentByKey.PTBK_AGENT || process.env.PTBK_AGENT || 'github-copilot'),
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

/**
 * Resolves a short runner-authentication status for the configured runner.
 *
 * @param agent - Runner id.
 * @returns Human-readable status.
 */
async function resolveRunnerStatus(agent: string): Promise<string> {
    if (agent !== 'github-copilot') {
        return 'Status check is currently available for GitHub Copilot CLI only.';
    }

    try {
        const { stdout, stderr } = await execFileAsync('copilot', ['auth', 'status'], {
            timeout: 10_000,
            maxBuffer: 128 * 1024,
        });
        return [stdout, stderr].filter(Boolean).join('\n').trim() || 'GitHub Copilot CLI returned no status output.';
    } catch (error) {
        return error instanceof Error ? error.message : 'GitHub Copilot CLI status check failed.';
    }
}
