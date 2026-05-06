import { createHash } from 'crypto';

/**
 * Resolves the shared internal token used to protect agent-preparation worker routes.
 */
export function resolveAgentPreparationWorkerInternalToken(): string {
    const entropySource =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.ADMIN_PASSWORD ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        'promptbook-agent-preparation-worker';

    return createHash('sha256').update(`agent-preparation-worker:${entropySource}`).digest('hex');
}
