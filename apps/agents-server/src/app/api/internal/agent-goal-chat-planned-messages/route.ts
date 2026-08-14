import { NextResponse } from 'next/server';
import { spaceTrim } from 'spacetrim';
import { LimitReachedError } from '../../../../../../../src/errors/LimitReachedError';
import { NotFoundError } from '../../../../../../../src/errors/NotFoundError';
import { ParseError } from '../../../../../../../src/errors/ParseError';
import { isTimingSafeEqualString } from '../../../../../../../src/utils/isTimingSafeEqualString';
import { USER_CHAT_WORKER_TOKEN_HEADER } from '@/src/utils/agentProjects/agentProjectRuntimeConstants';
import { AGENT_GOAL_CHAT_PLANNED_MESSAGE_ACTIONS } from '@/src/utils/agentGoalChat/agentGoalChatPlannedMessageActions';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { resolveUserChatWorkerInternalToken } from '@/src/utils/userChat';

/**
 * Actions accepted by the internal planned-message runtime route.
 */
const AGENT_GOAL_CHAT_PLANNED_MESSAGE_REQUEST_ACTIONS = ['set', 'list', 'cancel'] as const;

/**
 * Supported planned-message runtime action.
 */
type AgentGoalChatPlannedMessageAction = (typeof AGENT_GOAL_CHAT_PLANNED_MESSAGE_REQUEST_ACTIONS)[number];

/**
 * Parsed internal runtime request.
 */
type AgentGoalChatPlannedMessageRequest = {
    readonly action: AgentGoalChatPlannedMessageAction;
    readonly body: Record<string, unknown>;
};

/**
 * Keeps planned-message persistence on the Node.js runtime.
 */
export const runtime = 'nodejs';

/**
 * Handles planned-message commands from an Agents Server-managed coding agent.
 */
export async function POST(request: Request) {
    if (!isAuthorizedInternalWorkerRequest(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const plannedMessageRequest = await parseAgentGoalChatPlannedMessageRequest(request);
        const result = await executeAgentGoalChatPlannedMessageRequest(plannedMessageRequest);

        return NextResponse.json(result);
    } catch (error) {
        if (error instanceof ParseError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (error instanceof LimitReachedError) {
            return NextResponse.json({ error: error.message }, { status: 429 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        console.error('[agent-goal-chat-planned-messages] internal route failed', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to manage planned goal-chat messages.',
            },
            { status: 500 },
        );
    }
}

/**
 * Parses one internal planned-message request body.
 */
async function parseAgentGoalChatPlannedMessageRequest(request: Request): Promise<AgentGoalChatPlannedMessageRequest> {
    const rawBody = await request.json().catch(() => null);

    if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
        throw new ParseError('Expected a JSON object body.');
    }

    const body = rawBody as Record<string, unknown>;
    const action = normalizeAgentGoalChatPlannedMessageAction(body.action);

    return { action, body };
}

/**
 * Executes one normalized planned-message request through the shared action service.
 */
async function executeAgentGoalChatPlannedMessageRequest(request: AgentGoalChatPlannedMessageRequest) {
    const agentPermanentId = await resolveCanonicalAgentPermanentId(request.body.agentPermanentId);

    if (request.action === 'set') {
        return await AGENT_GOAL_CHAT_PLANNED_MESSAGE_ACTIONS.set({
            agentPermanentId,
            milliseconds: request.body.milliseconds,
            message: request.body.message,
        });
    }

    if (request.action === 'list') {
        return await AGENT_GOAL_CHAT_PLANNED_MESSAGE_ACTIONS.list({
            agentPermanentId,
            isIncludingFinished: request.body.isIncludingFinished,
            limit: request.body.limit,
        });
    }

    return await AGENT_GOAL_CHAT_PLANNED_MESSAGE_ACTIONS.cancel({
        agentPermanentId,
        timeoutId: request.body.timeoutId,
    });
}

/**
 * Validates one planned-message action value.
 */
function normalizeAgentGoalChatPlannedMessageAction(rawAction: unknown): AgentGoalChatPlannedMessageAction {
    if (
        typeof rawAction === 'string' &&
        AGENT_GOAL_CHAT_PLANNED_MESSAGE_REQUEST_ACTIONS.includes(rawAction as AgentGoalChatPlannedMessageAction)
    ) {
        return rawAction as AgentGoalChatPlannedMessageAction;
    }

    throw new ParseError(
        spaceTrim(`
            Invalid planned-message \`action\`.

            - Use one of: \`${AGENT_GOAL_CHAT_PLANNED_MESSAGE_REQUEST_ACTIONS.join('`, `')}\`.
        `),
    );
}

/**
 * Resolves an agent identifier to its canonical permanent id before persistence.
 *
 * Coding runners identify local folders with lowercase ids, while goal-chat and
 * timeout records use the canonical database id.
 *
 * @param rawAgentPermanentId - Untrusted identifier from the internal runtime request.
 * @returns The canonical permanent id of the active agent.
 */
async function resolveCanonicalAgentPermanentId(rawAgentPermanentId: unknown): Promise<string> {
    if (typeof rawAgentPermanentId !== 'string' || rawAgentPermanentId.trim().length === 0) {
        throw new ParseError('Missing required `agentPermanentId` string.');
    }

    const requestedAgentIdentifier = rawAgentPermanentId.trim();
    const collection = await $provideAgentCollectionForServer();
    const agent = await collection.findAgentBasicInformation(requestedAgentIdentifier);
    const agentPermanentId = agent?.permanentId?.trim();

    if (!agentPermanentId) {
        throw new NotFoundError(
            spaceTrim(`
                Agent \`${requestedAgentIdentifier}\` was not found.

                **Note:** Planned messages can only be managed for an active Agents Server agent.
            `),
        );
    }

    return agentPermanentId;
}

/**
 * Validates the shared internal worker token.
 */
function isAuthorizedInternalWorkerRequest(request: Request): boolean {
    const token = request.headers.get(USER_CHAT_WORKER_TOKEN_HEADER);
    return isTimingSafeEqualString(token, resolveUserChatWorkerInternalToken());
}
