import {
    getCodeRunnerAuthenticationSession,
    getLatestCodeRunnerAuthenticationSession,
    startCodeRunnerAuthenticationSession,
    stopCodeRunnerAuthenticationSession,
    subscribeToCodeRunnerAuthenticationSession,
    writeCodeRunnerAuthenticationSessionInput,
} from '@/src/utils/codeRunnerAuthentication';
import { createAdminTerminalRouteHandlers } from '@/src/utils/createAdminTerminalRouteHandlers';
import { readConfiguredCodeRunner } from '@/src/utils/codeRunnerConfiguration';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Shared route handlers for the code-runner authentication terminal.
 */
const authenticationTerminalRouteHandlers = createAdminTerminalRouteHandlers(
    {
        async getLatestSession() {
            const { agent } = await readConfiguredCodeRunner();
            return getLatestCodeRunnerAuthenticationSession(agent);
        },
        getSession: getCodeRunnerAuthenticationSession,
        async startSession() {
            const { agent } = await readConfiguredCodeRunner();
            return startCodeRunnerAuthenticationSession(agent);
        },
        writeSessionInput: writeCodeRunnerAuthenticationSessionInput,
        stopSession: stopCodeRunnerAuthenticationSession,
        subscribeToSession: subscribeToCodeRunnerAuthenticationSession,
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
