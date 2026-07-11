import { spaceTrim } from 'spacetrim';
import {
    DEFAULT_LOCAL_AGENT_RUNNER_MAX_FAILED_ATTEMPTS,
    DEFAULT_LOCAL_AGENT_RUNNER_MAX_PARALLEL_MESSAGES,
} from '../../../../../apps/agents-server/src/constants/serverLimits';
import { NotAllowed } from '../../../../errors/NotAllowed';
import type { number_port } from '../../../../types/number_positive';
import type { AgentsServerChildEnvironment } from './AgentsServerChildEnvironment';
import type { AgentsServerLogStreams } from './AgentsServerLogStreams';
import { logRunnerEvent } from './AgentsServerLogStreams';
import type { AgentsServerSupervisorState } from './AgentsServerSupervisorState';
import { createInternalRouteErrorMessage } from './createInternalRouteErrorMessage';
import type { LocalAgentRunnerLimits } from './LocalAgentRunnerLimits';
import { readInternalRouteErrorDetails } from './readInternalRouteErrorDetails';

/**
 * Delay between foreground CLI attempts to load internal Agents Server limits during startup.
 *
 * @private internal constant of `startAgentsServer`
 */
const INTERNAL_SERVER_LIMITS_RETRY_DELAY_MS = 1_000;

/**
 * Maximum time spent waiting for the internal limits route before startup fails.
 *
 * @private internal constant of `startAgentsServer`
 */
const INTERNAL_SERVER_LIMITS_STARTUP_TIMEOUT_MS = 60_000;

/**
 * Waits until the internal Next route can return current local runner limits.
 *
 * @private internal utility of `startAgentsServer`
 */
export async function waitForLocalAgentRunnerLimits(options: {
    readonly port: number_port;
    readonly environment: AgentsServerChildEnvironment;
    readonly logStreams: AgentsServerLogStreams;
    readonly state: AgentsServerSupervisorState;
}): Promise<LocalAgentRunnerLimits> {
    const startedAt = Date.now();
    let lastError: unknown;

    while (options.state.isContinuing && Date.now() - startedAt < INTERNAL_SERVER_LIMITS_STARTUP_TIMEOUT_MS) {
        try {
            const limits = await fetchLocalAgentRunnerLimits(options);
            logRunnerEvent(
                options.logStreams.runner,
                `Local agent runner limits: ${limits.maxFailedAttempts} failed attempt(s), ${limits.maxParallelMessages} parallel message(s).`,
            );
            return limits;
        } catch (error) {
            lastError = error;
            await wait(INTERNAL_SERVER_LIMITS_RETRY_DELAY_MS);
        }
    }

    if (!options.state.isContinuing) {
        return {
            maxFailedAttempts: DEFAULT_LOCAL_AGENT_RUNNER_MAX_FAILED_ATTEMPTS,
            maxParallelMessages: DEFAULT_LOCAL_AGENT_RUNNER_MAX_PARALLEL_MESSAGES,
        };
    }

    throw new NotAllowed(
        spaceTrim(`
            Failed to load local agent runner limits from the Agents Server.

            ${lastError instanceof Error ? lastError.message : String(lastError)}
        `),
    );
}

/**
 * Loads local runner limits through the token-protected internal Agents Server route.
 */
async function fetchLocalAgentRunnerLimits(options: {
    readonly port: number_port;
    readonly environment: AgentsServerChildEnvironment;
}): Promise<LocalAgentRunnerLimits> {
    const response = await fetch(`http://localhost:${options.port}/api/internal/agent-runner-limits`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
            'x-user-chat-worker-token': options.environment.PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN,
        },
    });

    if (!response.ok) {
        const details = await readInternalRouteErrorDetails(response);
        throw new Error(createInternalRouteErrorMessage('agent runner limits', response, details));
    }

    const payload = (await response.json()) as Partial<LocalAgentRunnerLimits>;
    return {
        maxFailedAttempts: normalizeLocalAgentRunnerMaxFailedAttempts(payload.maxFailedAttempts),
        maxParallelMessages: normalizeLocalAgentRunnerMaxParallelMessages(payload.maxParallelMessages),
    };
}

/**
 * Normalizes the local runner retry cap returned by the internal server route.
 */
function normalizeLocalAgentRunnerMaxFailedAttempts(rawValue: unknown): number {
    const parsedValue = Number(rawValue);

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        return DEFAULT_LOCAL_AGENT_RUNNER_MAX_FAILED_ATTEMPTS;
    }

    return Math.floor(parsedValue);
}

/**
 * Normalizes the local runner parallel message cap returned by the internal server route.
 */
function normalizeLocalAgentRunnerMaxParallelMessages(rawValue: unknown): number {
    const parsedValue = Number(rawValue);

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        return DEFAULT_LOCAL_AGENT_RUNNER_MAX_PARALLEL_MESSAGES;
    }

    return Math.floor(parsedValue);
}

/**
 * Waits for the given delay.
 */
async function wait(delayMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
}
