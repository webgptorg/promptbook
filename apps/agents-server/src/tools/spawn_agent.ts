import {
    parseCreateAgentInput,
} from '../../../../src/collection/agent-collection/CreateAgentInput';
import type { AgentBasicInformation } from '../../../../src/book-2.0/agent-source/AgentBasicInformation';
import {
    readToolRuntimeContextFromToolArgs,
    TOOL_RUNTIME_CONTEXT_ARGUMENT,
    type ToolRuntimeContext,
} from '../../../../src/commitments/_common/toolRuntimeContext';
import { LimitReachedError } from '../../../../src/errors/LimitReachedError';
import { NotAllowed } from '../../../../src/errors/NotAllowed';
import { ParseError } from '../../../../src/errors/ParseError';
import { assertsError } from '../../../../src/errors/assertsError';
import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';
import { $provideAgentCollectionForServer } from './$provideAgentCollectionForServer';
import { createAgentWithDefaultVisibility } from '../utils/createAgentWithDefaultVisibility';
import { isUserAdmin } from '../utils/isUserAdmin';
import { getSpawnAgentLimits, type SpawnAgentLimits } from '../utils/serverLimits';

/**
 * In-memory rate-limit buckets indexed by runtime actor key.
 */
const spawnRateLimitBuckets = new Map<string, number[]>();

/**
 * Input accepted by `spawn_agent` tool including hidden runtime context.
 */
type SpawnAgentToolArgs = Record<string, unknown> & {
    [TOOL_RUNTIME_CONTEXT_ARGUMENT]?: unknown;
};

/**
 * Error codes returned by `spawn_agent`.
 */
type SpawnAgentToolErrorCode = 'validation_error' | 'permission_denied' | 'limit_reached' | 'unknown_error';

/**
 * Structured error payload returned by `spawn_agent`.
 */
type SpawnAgentToolErrorPayload = {
    code: SpawnAgentToolErrorCode;
    message: string;
};

/**
 * Success payload returned by `spawn_agent`.
 */
type SpawnAgentToolSuccessResult = {
    status: 'created';
    agentId: string;
    agent: AgentBasicInformation & Required<Pick<AgentBasicInformation, 'permanentId'>>;
};

/**
 * Error payload returned by `spawn_agent`.
 */
type SpawnAgentToolErrorResult = {
    status: 'error';
    agentId: null;
    error: SpawnAgentToolErrorPayload;
};

/**
 * Result payload returned by `spawn_agent`.
 */
export type SpawnAgentToolResult = SpawnAgentToolSuccessResult | SpawnAgentToolErrorResult;

/**
 * Spawns one new persistent agent through the same create path used by manual creation.
 *
 * - Uses strict create-agent payload validation.
 * - Enforces create-agent permissions.
 * - Applies abuse limits (depth + per-actor rate limit).
 * - Returns structured JSON result (`status`, `agentId`, `agent` / `error`).
 */
export async function spawn_agent(args: SpawnAgentToolArgs): Promise<string> {
    try {
        if (!(await isUserAdmin())) {
            throw new NotAllowed(
                spaceTrim(`
                    Spawning agents is not allowed.

                    You are not authorized to create agents.
                `),
            );
        }

        const runtimeContext = readToolRuntimeContextFromToolArgs(args);
        const spawnAgentLimits = await getSpawnAgentLimits();
        ensureSpawnDepthWithinLimit(runtimeContext, spawnAgentLimits);
        registerSpawnAttempt(resolveSpawnRateLimitActorKey(runtimeContext), Date.now(), spawnAgentLimits);

        const createAgentInput = parseCreateAgentInput(stripHiddenRuntimeContext(args));
        const collection = await $provideAgentCollectionForServer();
        const createdAgent = await createAgentWithDefaultVisibility(collection, createAgentInput.source, {
            folderId: createAgentInput.folderId,
            sortOrder: createAgentInput.sortOrder,
            visibility: createAgentInput.visibility,
        });
        const result: SpawnAgentToolSuccessResult = {
            status: 'created',
            agentId: createdAgent.permanentId,
            agent: createdAgent,
        };

        console.info('[spawn_agent] Created agent', {
            agentId: result.agentId,
            actor: resolveSpawnRateLimitActorKey(runtimeContext),
            sourceLength: createAgentInput.source.length,
        });

        return JSON.stringify(result);
    } catch (error) {
        assertsError(error);

        const result: SpawnAgentToolErrorResult = {
            status: 'error',
            agentId: null,
            error: mapSpawnAgentError(error),
        };

        console.warn('[spawn_agent] Failed to create agent', {
            errorName: error.name,
            errorMessage: error.message,
        });

        return JSON.stringify(result);
    }
}

/**
 * Removes hidden runtime context key before strict create-agent payload validation.
 */
function stripHiddenRuntimeContext(args: SpawnAgentToolArgs): Omit<SpawnAgentToolArgs, typeof TOOL_RUNTIME_CONTEXT_ARGUMENT> {
    const sanitizedArgs = { ...args };
    delete sanitizedArgs[TOOL_RUNTIME_CONTEXT_ARGUMENT];
    return sanitizedArgs;
}

/**
 * Resolves one stable actor key for spawn rate limiting.
 */
function resolveSpawnRateLimitActorKey(runtimeContext: ToolRuntimeContext | null): string {
    const userId = runtimeContext?.memory?.userId;
    if (typeof userId === 'number' && Number.isFinite(userId)) {
        return `user:${userId}`;
    }

    const username = runtimeContext?.memory?.username;
    if (typeof username === 'string' && username.trim() !== '') {
        return `username:${username.trim().toLowerCase()}`;
    }

    const agentId = runtimeContext?.memory?.agentId;
    if (typeof agentId === 'string' && agentId.trim() !== '') {
        return `agent:${agentId.trim().toLowerCase()}`;
    }

    return 'anonymous';
}

/**
 * Registers a spawn attempt and throws when actor exceeds rate limit.
 */
function registerSpawnAttempt(actorKey: string, nowMs: number, limits: SpawnAgentLimits): void {
    const previousAttempts = spawnRateLimitBuckets.get(actorKey) || [];
    const attemptThreshold = nowMs - limits.rateLimitWindowMs;
    const recentAttempts = previousAttempts.filter((attemptTimeMs) => attemptTimeMs >= attemptThreshold);

    if (recentAttempts.length >= limits.maxCreatedPerWindow) {
        throw new LimitReachedError(
            spaceTrim(`
                Spawn rate limit exceeded.

                You can create at most ${limits.maxCreatedPerWindow} agents per ${formatSpawnRateLimitWindow(
                    limits.rateLimitWindowMs,
                )}.
            `),
        );
    }

    recentAttempts.push(nowMs);
    spawnRateLimitBuckets.set(actorKey, recentAttempts);
}

/**
 * Ensures requested spawn depth stays within allowed limits.
 */
function ensureSpawnDepthWithinLimit(runtimeContext: ToolRuntimeContext | null, limits: SpawnAgentLimits): void {
    const rawDepth = (runtimeContext as ToolRuntimeContext & { spawn?: { depth?: unknown } })?.spawn?.depth;
    const depth = typeof rawDepth === 'number' && Number.isFinite(rawDepth) ? Math.max(0, Math.floor(rawDepth)) : 0;

    if (depth >= limits.maxDepth) {
        throw new LimitReachedError(
            spaceTrim(`
                Spawn depth limit exceeded.

                Maximum supported spawn depth is ${limits.maxDepth}.
            `),
        );
    }
}

/**
 * Formats one spawn rate-limit window for human-readable error messages.
 */
function formatSpawnRateLimitWindow(windowMs: number): string {
    if (windowMs % 60_000 === 0) {
        const minutes = windowMs / 60_000;
        return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    }

    if (windowMs % 1_000 === 0) {
        const seconds = windowMs / 1_000;
        return `${seconds} second${seconds === 1 ? '' : 's'}`;
    }

    return `${windowMs} ms`;
}

/**
 * Maps runtime errors to stable structured spawn error payload.
 */
function mapSpawnAgentError(error: Error): SpawnAgentToolErrorPayload {
    if (error instanceof ParseError) {
        return {
            code: 'validation_error',
            message: error.message,
        };
    }

    if (error instanceof NotAllowed) {
        return {
            code: 'permission_denied',
            message: error.message,
        };
    }

    if (error instanceof LimitReachedError) {
        return {
            code: 'limit_reached',
            message: error.message,
        };
    }

    return {
        code: 'unknown_error',
        message: error.message,
    };
}

/**
 * Clears in-memory spawn rate-limit buckets.
 *
 * @private test helper for `spawn_agent`
 */
export function $clearSpawnAgentRateLimitBucketsForTests(): void {
    spawnRateLimitBuckets.clear();
}
