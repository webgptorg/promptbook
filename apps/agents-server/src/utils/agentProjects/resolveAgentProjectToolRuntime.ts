import { spaceTrim } from 'spacetrim';
import { readToolRuntimeContextFromToolArgs } from '../../../../../src/commitments/_common/toolRuntimeContext';
import { UnexpectedError } from '../../../../../src/errors/UnexpectedError';
import type { TODO_any } from '../../../../../src/utils/organization/TODO_any';

/**
 * Identity of the agent executing one project tool call.
 */
export type AgentProjectToolRuntime = {
    /**
     * Canonical `Agent.permanentId` owning the projects.
     */
    readonly agentPermanentId: string;

    /**
     * Human-readable agent name, when known.
     */
    readonly agentName?: string;

    /**
     * Origin of this Agents Server used to build absolute project links.
     */
    readonly localServerUrl?: string;
};

/**
 * Resolves the agent identity needed by local project tools from hidden tool runtime context.
 *
 * The agent identity is read the same way as for per-agent browser profiles, so project
 * ownership always follows the agent executing the tool call.
 *
 * @param args - Raw tool arguments including hidden runtime keys.
 * @returns Agent project tool runtime.
 */
export function resolveAgentProjectToolRuntime(args: Record<string, TODO_any>): AgentProjectToolRuntime {
    const runtimeContext = readToolRuntimeContextFromToolArgs(args);
    const agentPermanentId =
        normalizeOptionalText(runtimeContext?.chat?.agentId) || normalizeOptionalText(runtimeContext?.memory?.agentId);

    if (!agentPermanentId) {
        throw new UnexpectedError(
            spaceTrim(`
                Agent project tools require agent runtime context.

                The server did not provide an agent id in hidden tool context, so the project scope cannot be enforced.
            `),
        );
    }

    return {
        agentPermanentId,
        agentName:
            normalizeOptionalText(runtimeContext?.chat?.agentName) ||
            normalizeOptionalText(runtimeContext?.memory?.agentName),
        localServerUrl: normalizeOptionalText(runtimeContext?.agentsServer?.localServerUrl),
    };
}

/**
 * Normalizes optional string.
 *
 * @private function of `resolveAgentProjectToolRuntime`
 */
function normalizeOptionalText(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalizedValue = value.trim();
    return normalizedValue || undefined;
}
