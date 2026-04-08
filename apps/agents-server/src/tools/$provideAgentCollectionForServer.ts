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
 * [🐱‍🚀]
 */
export async function $provideAgentCollectionForServer(): Promise<AgentCollection> {
    // <- Note: This function is potentially async

    // TODO: [🐱‍🚀] [🌕] DRY

    const isVerbose = false; // true; // <- TODO: [🐱‍🚀] Pass

    // console.info('[🐱‍🚀] Creating NEW agent collection');

    /*
    // TODO: [🧟‍♂️][◽] DRY:
    const collection = new AgentCollectionInDirectory(path, tools, {
        isVerbose,
        isRecursive: true,
        isLazyLoaded: false,
        isCrashedOnError: true,
        // <- TODO: [🍖] Add `intermediateFilesStrategy`
    });
    */

    const supabase = $provideSupabaseForServer();
    const { publicUrl, tablePrefix } = await $provideServer();
    const cachedAgentCollection = agentCollectionsByTablePrefix.get(tablePrefix);

    if (cachedAgentCollection) {
        return cachedAgentCollection;
    }

    const providedCollection = new AgentCollectionInSupabase(supabase, {
        isVerbose,
        tablePrefix,
    });

    agentCollectionsByTablePrefix.set(tablePrefix, providedCollection);

    const [{ attachAgentPreparationScheduling }, { scheduleDefaultFederatedAgentsSync }] = await Promise.all([
        import('../utils/attachAgentPreparationScheduling'),
        import('../utils/defaultFederatedAgents/scheduleDefaultFederatedAgentsSync'),
    ]);

    attachAgentPreparationScheduling(providedCollection, { tablePrefix });
    scheduleDefaultFederatedAgentsSync({
        tablePrefix,
        localServerUrl: publicUrl.href,
    });

    return providedCollection;
}

// TODO: [🏓] Unite `xxxForServer` and `xxxForNode` naming
