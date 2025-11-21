'use server';

import { AgentCollectionInSupabase } from '@promptbook-local/core';
import { AgentCollection } from '@promptbook-local/types';
import { $provideSupabaseForServer } from '../database/$provideSupabaseForServer';

/**
 * Cache of provided agent collection
 *
 * @private internal cache for `$provideAgentCollectionForServer`
 */
let agentCollection: null | AgentCollection = null;

/**
 * !!!!
 */
export async function $provideAgentCollectionForServer(): Promise<AgentCollection> {
    // <- Note: This function is potentially async

    // TODO: !!!! [🌕] DRY

    const isVerbose = true; // <- TODO: !!!! Pass

    if (agentCollection !== null) {
        console.log('!!! Returning cached agent collection');
        return agentCollection;
        // TODO: !!!! Be aware of options changes
    }

    console.log('!!! Creating NEW agent collection');

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

    agentCollection = new AgentCollectionInSupabase(supabase, {
        isVerbose,
    });

    return agentCollection;
}
