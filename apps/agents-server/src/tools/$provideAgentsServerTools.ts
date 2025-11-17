'use server';

import { AgentCollectionInSupabase } from '@promptbook-local/core';
import { AgentCollection, ExecutionTools, TODO_any } from '@promptbook-local/types';
import { $detectRuntimeEnvironment } from '@promptbook-local/utils';
import { _OpenAiAssistantMetadataRegistration, _OpenAiAssistantRegistration } from '@promptbook-local/wizard';
import { $provideLlmToolsForCli } from '../../../../src/cli/common/$provideLlmToolsForCli';
import { $provideExecutablesForNode } from '../../../../src/executables/$provideExecutablesForNode';
import { $provideFilesystemForNode } from '../../../../src/scrapers/_common/register/$provideFilesystemForNode';
import { $provideScrapersForNode } from '../../../../src/scrapers/_common/register/$provideScrapersForNode';
import { $provideScriptingForNode } from '../../../../src/scrapers/_common/register/$provideScriptingForNode';
import { $sideEffect } from '../../../../src/utils/organization/$sideEffect';
import { getSupabaseForServer } from '../supabase/getSupabaseForServer';

$sideEffect(/* [㊗] */ _OpenAiAssistantMetadataRegistration, _OpenAiAssistantRegistration);
// <- TODO: !!!! Allow to dynamically install required metadata

console.log('$detectRuntimeEnvironment', $detectRuntimeEnvironment());

/**
 * Cache of provided agents server tools
 *
 * @private internal cache for `$provideAgentsServerTools`
 */
let agentsServerTools: null | {
    tools: ExecutionTools;
    collection: AgentCollection;
} = null;

/**
 * !!!!
 */
export async function $provideAgentsServerTools(): Promise<{
    tools: ExecutionTools;
    collection: AgentCollection;
}> {
    // TODO: !!!! [🌕] DRY

    if (agentsServerTools !== null) {
        console.log('!!! Returning cached agents server tools');
        return agentsServerTools;
        // TODO: !!!! Be aware of options changes
    }

    console.log('!!! Creating NEW agents server tools');

    // const path = '../../agents'; // <- TODO: !!!! Pass
    const isVerbose = true; // <- TODO: !!!! Pass
    const isCacheReloaded = false; // <- TODO: !!!! Pass
    const cliOptions = {
        provider: 'BRING_YOUR_OWN_KEYS',
    } as TODO_any; // <- TODO: !!!! Pass

    // TODO: DRY [◽]
    const prepareAndScrapeOptions = {
        isVerbose,
        isCacheReloaded,
    }; /* <- TODO: ` satisfies PrepareAndScrapeOptions` */
    const fs = await $provideFilesystemForNode(prepareAndScrapeOptions);
    const { /* [0] strategy,*/ llm } = await $provideLlmToolsForCli({
        cliOptions,
        ...prepareAndScrapeOptions,
    });
    const executables = await $provideExecutablesForNode(prepareAndScrapeOptions);
    const tools = {
        llm,
        fs,
        executables,
        scrapers: await $provideScrapersForNode({ fs, llm, executables }, prepareAndScrapeOptions),
        script: await $provideScriptingForNode(prepareAndScrapeOptions),
    } satisfies ExecutionTools;

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

    const supabase = getSupabaseForServer();

    const collection = new AgentCollectionInSupabase(supabase, tools, {
        isVerbose,
    });

    agentsServerTools = { tools, collection };

    return agentsServerTools;
}
