'use server';

import { AgentCollectionInSupabase } from '@promptbook-local/core';
import { AgentCollection } from '@promptbook-local/types';
import { just } from '../../../../src/utils/organization/just';
import { $provideSupabaseForServer } from '../database/$provideSupabaseForServer';
import { $provideServer } from './$provideServer';

/**
 * Cache of provided agent collection
 *
 * @private internal cache for `$provideAgentCollectionForServer`
 */
let agentCollection: null | AgentCollection = null;

/**
 * [🐱‍🚀]
 */
export async function $provideAgentCollectionForServer(): Promise<AgentCollection> {
    // <- Note: This function is potentially async

    // TODO: [🐱‍🚀] [🌕] DRY

    const isVerbose = false; // true; // <- TODO: [🐱‍🚀] Pass

    if (agentCollection !== null && just(false /* <- TODO: [🐱‍🚀] Fix caching */)) {
        // console.info('[🐱‍🚀] Returning cached agent collection');
        return agentCollection;
        // TODO: [🐱‍🚀] Be aware of options changes
    }

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
    const { tablePrefix } = await $provideServer();

    agentCollection = new AgentCollectionInSupabase(supabase, {
        isVerbose,
        tablePrefix,
    });

    return agentCollection;
}
