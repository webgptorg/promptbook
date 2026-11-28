import { serializeError } from '@promptbook-local/utils';
import { NextRequest, NextResponse } from 'next/server';
import { assertsError } from '../../../../../../src/errors/assertsError';
import { spawn_agent, type SpawnAgentToolResult } from '../../../tools/spawn_agent';

/**
 * Maps one spawn-tool error code to an HTTP status.
 */
function mapSpawnErrorCodeToHttpStatus(errorCode: string): number {
    if (errorCode === 'validation_error') {
        return 400;
    }

    if (errorCode === 'permission_denied') {
        return 403;
    }

    if (errorCode === 'limit_reached') {
        return 429;
    }

    return 500;
}

/**
 * API endpoint that proxies server-side `spawn_agent` tool for browser runtimes.
 *
 * @route POST /api/spawn-agent
 */
export async function POST(request: NextRequest) {
    try {
        const payload = await request.json();
        const rawResult = await spawn_agent(payload as Record<string, unknown>);
        const result = JSON.parse(rawResult) as SpawnAgentToolResult;

        if (result.status === 'error') {
            return NextResponse.json(
                {
                    success: false,
                    result,
                },
                {
                    status: mapSpawnErrorCodeToHttpStatus(result.error.code),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                },
            );
        }

        return NextResponse.json(
            {
                success: true,
                result,
            },
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        );
    } catch (error) {
        assertsError(error);
        console.error('Error spawning agent:', error);

        return NextResponse.json(
            {
                error: serializeError(error),
                success: false,
            },
            { status: 500 },
        );
    }
}
