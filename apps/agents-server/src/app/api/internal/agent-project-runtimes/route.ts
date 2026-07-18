import { NextResponse } from 'next/server';
import { ParseError } from '../../../../../../../src/errors/ParseError';
import { NotAllowed } from '../../../../../../../src/errors/NotAllowed';
import { NotFoundError } from '../../../../../../../src/errors/NotFoundError';
import { isTimingSafeEqualString } from '../../../../../../../src/utils/isTimingSafeEqualString';
import {
    USER_CHAT_WORKER_TOKEN_HEADER,
} from '@/src/utils/agentProjects/agentProjectRuntimeConstants';
import {
    assignAgentProjectPort,
    startAgentProjectDevRuntime,
    startAgentProjectStaticRuntime,
    terminateAgentProjectRuntimeForProject,
} from '@/src/utils/agentProjects/agentProjectRuntimeRegistry';
import { resolveUserChatWorkerInternalToken } from '@/src/utils/userChat';

/**
 * Actions accepted by the internal agent-project runtime route.
 */
const AGENT_PROJECT_RUNTIME_REQUEST_ACTIONS = [
    'assign_port',
    'start_static_server',
    'start_dev_server',
    'terminate',
] as const;

/**
 * Supported internal runtime action.
 */
type AgentProjectRuntimeRequestAction = (typeof AGENT_PROJECT_RUNTIME_REQUEST_ACTIONS)[number];

/**
 * Normalized internal runtime request.
 */
type AgentProjectRuntimeRequest = {
    readonly action: AgentProjectRuntimeRequestAction;
    readonly agentPermanentId: string;
    readonly projectName: string;
    readonly command?: string;
};

/**
 * Ensures the route always runs in the Node.js runtime because it owns local servers and child processes.
 */
export const runtime = 'nodejs';

/**
 * Handles project runtime commands from local agent runners.
 */
export async function POST(request: Request) {
    if (!isAuthorizedInternalWorkerRequest(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const payload = await parseAgentProjectRuntimeRequest(request);
        const runtimeInfo = await executeAgentProjectRuntimeRequest(payload);

        return NextResponse.json({ runtime: runtimeInfo });
    } catch (error) {
        if (error instanceof ParseError || error instanceof NotAllowed) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        console.error('[agent-project-runtimes] internal route failed', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to manage agent project runtime.',
            },
            { status: 500 },
        );
    }
}

/**
 * Parses and validates the internal project runtime request body.
 */
async function parseAgentProjectRuntimeRequest(request: Request): Promise<AgentProjectRuntimeRequest> {
    const rawBody = await request.json().catch(() => null);

    if (!rawBody || typeof rawBody !== 'object') {
        throw new ParseError('Expected a JSON object body.');
    }

    const body = rawBody as Record<string, unknown>;
    const action = normalizeAgentProjectRuntimeAction(body.action);
    const agentPermanentId = normalizeRequiredText(body.agentPermanentId, 'agentPermanentId');
    const projectName = normalizeRequiredText(body.projectName, 'projectName');
    const command = normalizeOptionalText(body.command, 'command');

    return {
        action,
        agentPermanentId,
        projectName,
        ...(command !== undefined ? { command } : {}),
    };
}

/**
 * Executes one normalized project runtime request.
 */
async function executeAgentProjectRuntimeRequest(payload: AgentProjectRuntimeRequest) {
    if (payload.action === 'assign_port') {
        return await assignAgentProjectPort(payload);
    }

    if (payload.action === 'start_static_server') {
        return await startAgentProjectStaticRuntime(payload);
    }

    if (payload.action === 'start_dev_server') {
        return await startAgentProjectDevRuntime(payload);
    }

    return await terminateAgentProjectRuntimeForProject(payload);
}

/**
 * Validates one action value.
 */
function normalizeAgentProjectRuntimeAction(rawAction: unknown): AgentProjectRuntimeRequestAction {
    const normalizedAction = normalizeRequiredText(rawAction, 'action');

    if (AGENT_PROJECT_RUNTIME_REQUEST_ACTIONS.includes(normalizedAction as AgentProjectRuntimeRequestAction)) {
        return normalizedAction as AgentProjectRuntimeRequestAction;
    }

    throw new ParseError(
        `Invalid action \`${normalizedAction}\`. Use one of: \`${AGENT_PROJECT_RUNTIME_REQUEST_ACTIONS.join('`, `')}\`.`,
    );
}

/**
 * Normalizes one required text field.
 */
function normalizeRequiredText(rawValue: unknown, fieldName: string): string {
    if (typeof rawValue !== 'string') {
        throw new ParseError(`Missing required \`${fieldName}\` string.`);
    }

    const normalizedValue = rawValue.trim();
    if (!normalizedValue) {
        throw new ParseError(`Missing required \`${fieldName}\` string.`);
    }

    return normalizedValue;
}

/**
 * Normalizes one optional text field.
 */
function normalizeOptionalText(rawValue: unknown, fieldName: string): string | undefined {
    if (rawValue === undefined || rawValue === null) {
        return undefined;
    }

    if (typeof rawValue !== 'string') {
        throw new ParseError(`Invalid \`${fieldName}\` value. Expected a string.`);
    }

    const normalizedValue = rawValue.trim();
    return normalizedValue || undefined;
}

/**
 * Validates the shared internal worker token.
 */
function isAuthorizedInternalWorkerRequest(request: Request): boolean {
    const token = request.headers.get(USER_CHAT_WORKER_TOKEN_HEADER);
    return isTimingSafeEqualString(token, resolveUserChatWorkerInternalToken());
}

