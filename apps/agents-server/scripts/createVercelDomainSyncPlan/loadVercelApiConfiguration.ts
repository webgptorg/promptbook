import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../../src/errors/DatabaseError';
import type { VercelApiConfiguration } from './VercelDomainSyncPlan';

/**
 * Loads Vercel API configuration from environment variables.
 *
 * @returns Validated Vercel API configuration.
 *
 * @private function of `sync-vercel-domains`
 */
export function loadVercelApiConfiguration(): VercelApiConfiguration {
    const token = process.env.VERCEL_TOKEN?.trim();
    const projectIdOrName = (process.env.VERCEL_PROJECT_ID_OR_NAME || process.env.VERCEL_PROJECT_ID || '').trim();
    const teamId = process.env.VERCEL_TEAM_ID?.trim() || undefined;

    if (!token || !projectIdOrName) {
        throw new DatabaseError(
            spaceTrim(`
                Cannot sync Vercel domains because \`VERCEL_TOKEN\` and \`VERCEL_PROJECT_ID_OR_NAME\` (or \`VERCEL_PROJECT_ID\`) are required.
            `),
        );
    }

    return {
        token,
        projectIdOrName,
        teamId,
    };
}
