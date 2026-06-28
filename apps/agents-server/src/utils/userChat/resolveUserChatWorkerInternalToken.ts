import { randomBytes } from 'crypto';
import { spaceTrim } from 'spacetrim';
import { EnvironmentMismatchError } from '../../../../../src/errors/EnvironmentMismatchError';

/**
 * Cached internal worker token resolved from `PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN` on first use.
 *
 * Computed lazily so module imports never fail eagerly at build time and the
 * environment can still be configured before the first internal worker request.
 *
 * @private internal cache of `resolveUserChatWorkerInternalToken`
 */
let resolvedUserChatWorkerInternalToken: string | null = null;

/**
 * Resolves the shared internal token used to protect background worker routes.
 *
 * In production, `PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN` must be configured
 * explicitly — falling back to any shared credential (in particular
 * `ADMIN_PASSWORD` or `SUPABASE_SERVICE_ROLE_KEY`) or a hardcoded literal would
 * let anyone who learns that value (or computes its publicly-known hash) drive
 * internal worker jobs at will. Outside production, a per-process random token
 * is generated on first use so local development works without configuration
 * while still rejecting unsafe shared fallbacks.
 *
 * @returns Shared internal worker token.
 * @throws {EnvironmentMismatchError} When the environment variable is missing in production.
 *
 * @private internal utility of Agents Server
 */
export function resolveUserChatWorkerInternalToken(): string {
    if (resolvedUserChatWorkerInternalToken !== null) {
        return resolvedUserChatWorkerInternalToken;
    }

    const configuredToken = process.env.PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN?.trim();
    if (configuredToken) {
        resolvedUserChatWorkerInternalToken = configuredToken;
        return resolvedUserChatWorkerInternalToken;
    }

    if (process.env.NODE_ENV === 'production') {
        throw new EnvironmentMismatchError(
            spaceTrim(`
                Missing required \`PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN\` environment variable in production.

                The Agents Server protects its internal worker routes
                (\`/api/internal/user-chat-jobs/run\`,
                \`/api/internal/user-chat-timeouts/run\`, and
                \`/api/internal/agent-runner-limits\`) with this shared token.
                Reusing \`ADMIN_PASSWORD\`, \`SUPABASE_SERVICE_ROLE_KEY\`, or a
                hardcoded fallback would let anyone who learns that value drive
                background jobs at will.

                **Fix:** set \`PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN\` to a long
                random string (for example the output of \`openssl rand -hex 32\`)
                in the deployment environment and restart the server.
            `),
        );
    }

    resolvedUserChatWorkerInternalToken = randomBytes(32).toString('hex');
    console.warn(
        spaceTrim(`
            \`PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN\` is not configured — generated
            a random per-process internal worker token for this non-production run.
            Pending internal worker invocations will be invalidated on every restart
            until \`PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN\` is set.
        `),
    );
    return resolvedUserChatWorkerInternalToken;
}
