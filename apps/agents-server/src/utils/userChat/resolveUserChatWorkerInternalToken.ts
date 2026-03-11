import { createHash } from 'crypto';

/**
 * Resolves the shared internal token used to protect background worker routes.
 */
export function resolveUserChatWorkerInternalToken(): string {
    const entropySource =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.ADMIN_PASSWORD ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        'promptbook-user-chat-worker';

    return createHash('sha256').update(`user-chat-worker:${entropySource}`).digest('hex');
}
