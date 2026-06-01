import { createAdminTerminalRouteHandlers } from '@/src/utils/createAdminTerminalRouteHandlers';
import {
    getLatestServerCliAccessSession,
    getServerCliAccessSession,
    startServerCliAccessSession,
    stopServerCliAccessSession,
    subscribeToServerCliAccessSession,
    writeServerCliAccessSessionInput,
} from '@/src/utils/serverCliAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Shared route handlers for the raw server shell terminal.
 */
const cliAccessTerminalRouteHandlers = createAdminTerminalRouteHandlers(
    {
        getLatestSession: getLatestServerCliAccessSession,
        getSession: getServerCliAccessSession,
        startSession: startServerCliAccessSession,
        writeSessionInput: writeServerCliAccessSessionInput,
        stopSession: stopServerCliAccessSession,
        subscribeToSession: subscribeToServerCliAccessSession,
    },
    {
        loadErrorMessage: 'Failed to load the CLI access session.',
        missingStreamSessionIdMessage: 'CLI access session id is required.',
        sessionNotFoundMessage: 'CLI access session was not found.',
        startErrorMessage: 'Failed to start the CLI access session.',
        missingInputMessage: 'CLI access session input is required.',
        sendErrorMessage: 'Failed to send CLI access input.',
        missingStopSessionIdMessage: 'CLI access session id is required.',
        stopErrorMessage: 'Failed to stop the CLI access session.',
    },
);

export const GET = cliAccessTerminalRouteHandlers.GET;
export const POST = cliAccessTerminalRouteHandlers.POST;
export const PATCH = cliAccessTerminalRouteHandlers.PATCH;
export const DELETE = cliAccessTerminalRouteHandlers.DELETE;
