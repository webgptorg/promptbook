import { loadLocalAgentRunnerConfiguration } from './externalChatRunner/LocalAgentRunnerConfiguration';

/**
 * Delay between self-hosted durable worker rounds.
 */
const SELF_HOSTED_AGENTS_SERVER_WORKER_INTERVAL_MS = 2_000;

/**
 * Default localhost port used before the CLI provides `PORT`.
 */
const SELF_HOSTED_AGENTS_SERVER_DEFAULT_PORT = 4440;

/**
 * Internal route running one durable user-chat job worker round.
 */
const SELF_HOSTED_CHAT_JOB_WORKER_PATH = '/api/internal/user-chat-jobs/run';

/**
 * Internal route running one durable timeout worker round.
 */
const SELF_HOSTED_CHAT_TIMEOUT_WORKER_PATH = '/api/internal/user-chat-timeouts/run';

/**
 * Singleton worker interval started inside the self-hosted Next.js process.
 */
let selfHostedWorkerInterval: NodeJS.Timeout | undefined;

/**
 * Guard preventing overlapping self-hosted worker rounds.
 */
let isSelfHostedWorkerTickRunning = false;

/**
 * Starts in-process durable workers for `ptbk agents-server start`.
 */
export function startSelfHostedAgentsServerWorkers(): void {
    if (!loadLocalAgentRunnerConfiguration() || selfHostedWorkerInterval) {
        return;
    }

    void runSelfHostedAgentsServerWorkerTick();
    selfHostedWorkerInterval = setInterval(() => {
        void runSelfHostedAgentsServerWorkerTick();
    }, SELF_HOSTED_AGENTS_SERVER_WORKER_INTERVAL_MS);
}

/**
 * Advances local chat runner sync and timeout jobs without overlapping the previous tick.
 */
async function runSelfHostedAgentsServerWorkerTick(): Promise<void> {
    if (isSelfHostedWorkerTickRunning) {
        return;
    }

    isSelfHostedWorkerTickRunning = true;

    try {
        await Promise.all([
            invokeSelfHostedWorkerRoute(SELF_HOSTED_CHAT_JOB_WORKER_PATH),
            invokeSelfHostedWorkerRoute(SELF_HOSTED_CHAT_TIMEOUT_WORKER_PATH),
        ]);
    } catch (error) {
        console.error('[self-hosted-agents-server] Worker tick failed', error);
    } finally {
        isSelfHostedWorkerTickRunning = false;
    }
}

/**
 * Invokes one internal durable worker route inside the running self-hosted server.
 */
async function invokeSelfHostedWorkerRoute(path: string): Promise<void> {
    const response = await fetch(new URL(path, resolveSelfHostedAgentsServerOrigin()), {
        method: 'POST',
        cache: 'no-store',
        headers: {
            'x-user-chat-worker-token': await resolveSelfHostedUserChatWorkerInternalToken(),
        },
    });

    if (!response.ok && response.status !== 204) {
        throw new Error(`Self-hosted worker route "${path}" failed: ${response.status} ${response.statusText}`);
    }
}

/**
 * Resolves the current self-hosted Agents Server origin for local worker self-calls.
 */
function resolveSelfHostedAgentsServerOrigin(): string {
    const explicitSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

    if (explicitSiteUrl) {
        return explicitSiteUrl.replace(/\/+$/u, '');
    }

    return `http://localhost:${resolveSelfHostedAgentsServerPort()}`;
}

/**
 * Resolves the running local port shared by the foreground CLI and Next.js child process.
 */
function resolveSelfHostedAgentsServerPort(): number {
    const parsedPort = Number(process.env.PORT);

    if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
        return SELF_HOSTED_AGENTS_SERVER_DEFAULT_PORT;
    }

    return parsedPort;
}

/**
 * Resolves the route token without importing the Node-only worker route implementation into instrumentation.
 */
async function resolveSelfHostedUserChatWorkerInternalToken(): Promise<string> {
    const entropySource =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.ADMIN_PASSWORD ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        'promptbook-user-chat-worker';
    const encodedTokenSource = new TextEncoder().encode(`user-chat-worker:${entropySource}`);
    const tokenHash = await crypto.subtle.digest('SHA-256', encodedTokenSource);

    return Array.from(new Uint8Array(tokenHash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
