import { NextRequest, NextResponse } from 'next/server';
import spaceTrim from 'spacetrim';
import { NotAllowed } from '../../../../../../../src/errors/NotAllowed';
import { isUserAdmin } from '../../../../utils/isUserAdmin';

/**
 * Supported server-side failure simulation modes.
 */
type ServerSimulationMode = 'success' | 'handled-500' | 'unhandled-throw' | 'invalid-json';

/**
 * HTTP status code used for malformed requests.
 */
const HTTP_STATUS_BAD_REQUEST = 400;

/**
 * HTTP status code used for unauthorized access.
 */
const HTTP_STATUS_UNAUTHORIZED = 401;

/**
 * HTTP status code used for simulated internal server errors.
 */
const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;

/**
 * Query-string key used for selecting the simulation mode.
 */
const MODE_QUERY_KEY = 'mode';

/**
 * Set of accepted simulation modes exposed by this endpoint.
 */
const SERVER_SIMULATION_MODES: readonly ServerSimulationMode[] = [
    'success',
    'handled-500',
    'unhandled-throw',
    'invalid-json',
];

/**
 * Resolves and validates the requested simulation mode.
 *
 * @param request - Incoming HTTP request.
 * @returns Valid mode or `null` when unknown mode is requested.
 */
function resolveSimulationMode(request: NextRequest): ServerSimulationMode | null {
    const rawMode = request.nextUrl.searchParams.get(MODE_QUERY_KEY);

    if (!rawMode) {
        return 'success';
    }

    if (SERVER_SIMULATION_MODES.includes(rawMode as ServerSimulationMode)) {
        return rawMode as ServerSimulationMode;
    }

    return null;
}

/**
 * Handles admin-only error simulation requests.
 *
 * @param request - Incoming HTTP request.
 * @returns Simulated response payload for the selected mode.
 */
export async function GET(request: NextRequest) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS_UNAUTHORIZED });
    }

    const mode = resolveSimulationMode(request);
    if (!mode) {
        return NextResponse.json(
            {
                error: `Unknown mode. Allowed modes: ${SERVER_SIMULATION_MODES.join(', ')}`,
            },
            { status: HTTP_STATUS_BAD_REQUEST },
        );
    }

    if (mode === 'success') {
        return NextResponse.json({
            ok: true,
            mode,
            timestamp: new Date().toISOString(),
        });
    }

    if (mode === 'handled-500') {
        const errorMessage = spaceTrim(`
            [Error simulation] Intentional handled API failure.

            This endpoint returned HTTP 500 on purpose so admins can verify client handling, server logs, and monitoring.
        `);

        console.error('[Error simulation] handled-500 mode triggered intentionally.');
        return NextResponse.json(
            {
                ok: false,
                mode,
                error: errorMessage,
            },
            { status: HTTP_STATUS_INTERNAL_SERVER_ERROR },
        );
    }

    if (mode === 'invalid-json') {
        const plainTextError = spaceTrim(`
            [Error simulation] Intentional plain-text HTTP 500 response.

            This payload is not JSON on purpose so client-side JSON parsing failures can be tested.
        `);

        console.error('[Error simulation] invalid-json mode triggered intentionally.');
        return new NextResponse(plainTextError, {
            status: HTTP_STATUS_INTERNAL_SERVER_ERROR,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
            },
        });
    }

    throw new NotAllowed(
        spaceTrim(`
            [Error simulation] Intentional unhandled server throw from \`/api/admin/error-simulation\`.

            This failure mode is expected and should be used to validate server exception logging and monitoring alerts.
        `),
    );
}
