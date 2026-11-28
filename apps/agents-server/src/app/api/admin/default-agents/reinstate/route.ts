import { NextResponse } from 'next/server';
import { seedCoreAgents } from '../../../../../database/seedCoreAgents';
import { reinstateDefaultAgents } from '../../../../../database/reinstateDefaultAgents';
import { $provideServer } from '../../../../../tools/$provideServer';
import { $invalidateProvidedAgentReferenceResolverCache } from '../../../../../utils/agentReferenceResolver/$provideAgentReferenceResolver';
import { invalidateCachedActiveOrganizationSnapshots } from '../../../../../utils/agentOrganization/loadAgentOrganizationState';
import { invalidateCachedServerAgentRuntime } from '../../../../../utils/cachedServerAgentRuntime';
import { isUserAdmin } from '../../../../../utils/isUserAdmin';

/**
 * Supported reinstatement scopes for the bundled agents.
 *
 * @private type of the default-agents reinstate route
 */
type ReinstateScope = 'core' | 'default';

/**
 * Reinstates the missing bundled core or normal default agents on the current server.
 *
 * This exposes — ex-post and admin-gated — the same default/core agent creation logic that runs when a server is first
 * created, so an admin can restore agents that were removed without recreating the whole server.
 *
 * @param request - Incoming reinstate request carrying the `scope`.
 * @returns Names of the agents created during this run.
 */
export async function POST(request: Request) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let scope: ReinstateScope;
    try {
        const body = (await request.json()) as { scope?: unknown };
        if (body.scope !== 'core' && body.scope !== 'default') {
            return NextResponse.json(
                { error: 'The `scope` field must be either `core` or `default`.' },
                { status: 400 },
            );
        }
        scope = body.scope;
    } catch {
        return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
    }

    try {
        const { tablePrefix } = await $provideServer();
        const createdAgentNames =
            scope === 'core'
                ? (await seedCoreAgents({ tablePrefix })).createdAgentNames
                : (await reinstateDefaultAgents({ tablePrefix })).createdAgentNames;

        // Note: These direct collection writes bypass the normal collection decoration that invalidates these caches.
        $invalidateProvidedAgentReferenceResolverCache();
        invalidateCachedServerAgentRuntime();
        invalidateCachedActiveOrganizationSnapshots();

        return NextResponse.json({ scope, createdAgentNames });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to reinstate the bundled agents.',
            },
            { status: 500 },
        );
    }
}
