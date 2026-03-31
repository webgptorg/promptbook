'use server';

import type { AgentCollection } from '../../../../src/collection/agent-collection/AgentCollection';
import { AgentCollectionInSupabase } from '../../../../src/collection/agent-collection/constructors/agent-collection-in-supabase/AgentCollectionInSupabase';
import { $provideSupabaseForServer } from '../database/$provideSupabaseForServer';
import { $provideServer } from './$provideServer';

/**
 * Cache of provided agent collections keyed by table prefix.
 *
 * @private internal cache for `$provideAgentCollectionForServer`
 */
const agentCollectionsByTablePrefix = new Map<string, AgentCollection>();

/**
 * In-flight collection initialization keyed by table prefix.
 *
 * @private internal cache for `$provideAgentCollectionForServer`
 */
const pendingAgentCollectionsByTablePrefix = new Map<string, Promise<AgentCollection>>();

/**
 * [🐱‍🚀]
 */
export async function $provideAgentCollectionForServer(): Promise<AgentCollection> {
    // <- Note: This function is potentially async

    // TODO: [🐱‍🚀] [🌕] DRY

    const isVerbose = false; // true; // <- TODO: [🐱‍🚀] Pass

    const { publicUrl, tablePrefix } = await $provideServer();
    const cachedAgentCollection = agentCollectionsByTablePrefix.get(tablePrefix);

    if (cachedAgentCollection !== undefined) {
        return cachedAgentCollection;
    }

    const pendingAgentCollection = pendingAgentCollectionsByTablePrefix.get(tablePrefix);
    if (pendingAgentCollection) {
        return pendingAgentCollection;
    }

    const initialization = (async (): Promise<AgentCollection> => {
        const supabase = $provideSupabaseForServer();

        const providedCollection = new AgentCollectionInSupabase(supabase, {
            isVerbose,
            tablePrefix,
        });

        const [{ attachAgentPreparationScheduling }, { scheduleDefaultFederatedAgentsSync }] = await Promise.all([
            import('../utils/attachAgentPreparationScheduling'),
            import('../utils/defaultFederatedAgents/scheduleDefaultFederatedAgentsSync'),
        ]);

        attachAgentPreparationScheduling(providedCollection, { tablePrefix });
        scheduleDefaultFederatedAgentsSync({
            tablePrefix,
            localServerUrl: publicUrl.href,
        });

        agentCollectionsByTablePrefix.set(tablePrefix, providedCollection);
        return providedCollection;
    })().finally(() => {
        pendingAgentCollectionsByTablePrefix.delete(tablePrefix);
    });

    pendingAgentCollectionsByTablePrefix.set(tablePrefix, initialization);
    return initialization;
}

/**
 * TODO: [🏓] Unite `xxxForServer` and `xxxForNode` naming
 */
