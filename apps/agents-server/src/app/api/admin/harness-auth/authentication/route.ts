import {
    getHarnessAuthenticationSession,
    getLatestHarnessAuthenticationSession,
    startHarnessAuthenticationSession,
    stopHarnessAuthenticationSession,
    subscribeToHarnessAuthenticationSession,
    writeHarnessAuthenticationSessionInput,
} from '@/src/utils/harnessAuthentication';
import { createAdminTerminalRouteHandlers } from '@/src/utils/createAdminTerminalRouteHandlers';
import { readConfiguredHarness } from '@/src/utils/harnessConfiguration';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Shared route handlers for the harness authentication terminal.
 */
const authenticationTerminalRouteHandlers = createAdminTerminalRouteHandlers(
    {
        async getLatestSession() {
            const { harness } = await readConfiguredHarness();
            return getLatestHarnessAuthenticationSession(harness);
        },
        getSession: getHarnessAuthenticationSession,
        async startSession() {
            const { harness } = await readConfiguredHarness();
            return startHarnessAuthenticationSession(harness);
        },
        writeSessionInput: writeHarnessAuthenticationSessionInput,
        stopSession: stopHarnessAuthenticationSession,
        subscribeToSession: subscribeToHarnessAuthenticationSession,
    },
    {
        loadErrorMessage: 'Failed to load the authentication session.',
        missingStreamSessionIdMessage: 'Authentication session id is required.',
        sessionNotFoundMessage: 'Authentication session was not found.',
        startErrorMessage: 'Failed to start the authentication session.',
        missingInputMessage: 'Authentication session input is required.',
        sendErrorMessage: 'Failed to send authentication input.',
        missingStopSessionIdMessage: 'Authentication session id is required.',
        stopErrorMessage: 'Failed to stop the authentication session.',
    },
);

export const GET = authenticationTerminalRouteHandlers.GET;
export const POST = authenticationTerminalRouteHandlers.POST;
export const PATCH = authenticationTerminalRouteHandlers.PATCH;
export const DELETE = authenticationTerminalRouteHandlers.DELETE;
