'use server';

import { _AnthropicClaudeRegistration } from '@promptbook-local/anthropic-claude';
import { _AzureOpenAiRegistration } from '@promptbook-local/azure-openai';
import {
    _AnthropicClaudeMetadataRegistration,
    _AzureOpenAiMetadataRegistration,
    _BoilerplateScraperMetadataRegistration,
    _DeepseekMetadataRegistration,
    _DocumentScraperMetadataRegistration,
    _GoogleMetadataRegistration,
    _LegacyDocumentScraperMetadataRegistration,
    _MarkdownScraperMetadataRegistration,
    _MarkitdownScraperMetadataRegistration,
    _OllamaMetadataRegistration,
    _OpenAiAssistantMetadataRegistration,
    _OpenAiCompatibleMetadataRegistration,
    _OpenAiMetadataRegistration,
    _PdfScraperMetadataRegistration,
    _WebsiteScraperMetadataRegistration,
    cacheLlmTools,
} from '@promptbook-local/core';
import { _DeepseekRegistration } from '@promptbook-local/deepseek';
import { _GoogleRegistration } from '@promptbook-local/google';
import { _OllamaRegistration } from '@promptbook-local/ollama';
import {
    _OpenAiAssistantRegistration,
    _OpenAiCompatibleRegistration,
    _OpenAiRegistration,
} from '@promptbook-local/openai';
import { ExecutionTools, TODO_any } from '@promptbook-local/types';
import { $provideLlmToolsForCli } from '../../../../src/cli/common/$provideLlmToolsForCli';
import { $provideExecutablesForNode } from '../../../../src/executables/$provideExecutablesForNode';
import { $provideFilesystemForNode } from '../../../../src/scrapers/_common/register/$provideFilesystemForNode';
import { $provideScrapersForNode } from '../../../../src/scrapers/_common/register/$provideScrapersForNode';
import { $provideScriptingForNode } from '../../../../src/scrapers/_common/register/$provideScriptingForNode';
import { $sideEffect } from '../../../../src/utils/organization/$sideEffect';
import { SupabaseCacheStorage } from '../utils/cache/SupabaseCacheStorage';

$sideEffect(
    _AnthropicClaudeMetadataRegistration,
    _AzureOpenAiMetadataRegistration,
    _DeepseekMetadataRegistration,
    _GoogleMetadataRegistration,
    _OllamaMetadataRegistration,
    _OpenAiMetadataRegistration,
    _OpenAiAssistantMetadataRegistration,
    _OpenAiCompatibleMetadataRegistration,
    _BoilerplateScraperMetadataRegistration,
    _LegacyDocumentScraperMetadataRegistration,
    _DocumentScraperMetadataRegistration,
    _MarkdownScraperMetadataRegistration,
    _MarkitdownScraperMetadataRegistration,
    _PdfScraperMetadataRegistration,
    _WebsiteScraperMetadataRegistration,
    // <- TODO: [🐱‍🚀] Export all registrations from one variabile in `@promptbook/core`
);
$sideEffect(/* [㊗] */ _AnthropicClaudeRegistration);
$sideEffect(/* [㊗] */ _AzureOpenAiRegistration);
$sideEffect(/* [㊗] */ _DeepseekRegistration);
$sideEffect(/* [㊗] */ _OpenAiRegistration);
$sideEffect(/* [㊗] */ _OpenAiAssistantRegistration);
$sideEffect(/* [㊗] */ _OpenAiCompatibleRegistration);
$sideEffect(/* [㊗] */ _GoogleRegistration);
$sideEffect(/* [㊗] */ _OllamaRegistration);
// <- TODO: [🐱‍🚀] Allow to dynamically install required metadata

/**
 * Cache of provided execution tools
 *
 * @private internal cache for `$provideExecutionToolsForServer`
 */
let executionTools: null | ExecutionTools = null;

/*
TODO: [▶️]
type ProvideExecutionToolsForServerOptions = {
 isLlmProvided
}
*/

/**
 * [🐱‍🚀]
 */
export async function $provideExecutionToolsForServer(): Promise<ExecutionTools> {
    // TODO: [🐱‍🚀] [🌕] DRY

    // const path = '../../agents'; // <- TODO: [🐱‍🚀] Pass
    const isVerbose = true; // <- TODO: [🐱‍🚀] Pass
    const isCacheReloaded = false; // <- TODO: [🐱‍🚀] Pass
    const cliOptions = {
        provider: 'BRING_YOUR_OWN_KEYS',
    } as TODO_any; // <- TODO: [🐱‍🚀] Pass

    if (executionTools !== null) {
        console.log('[🐱‍🚀] Returning cached execution tools');
        return executionTools;
        // TODO: [🐱‍🚀] Be aware of options changes
    }

    console.log('[🐱‍🚀] Creating NEW execution tools');

    // TODO: DRY [◽]
    const prepareAndScrapeOptions = {
        isVerbose,
        isCacheReloaded,
    }; /* <- TODO: ` satisfies PrepareAndScrapeOptions` */
    const fs = await $provideFilesystemForNode(prepareAndScrapeOptions);
    const { /* [0] strategy,*/ llm: llmUncached } = await $provideLlmToolsForCli({
        cliOptions,
        ...prepareAndScrapeOptions,
    });

    const llm = cacheLlmTools(llmUncached, {
        storage: new SupabaseCacheStorage(),
        isVerbose,
        isCacheReloaded,
    });

    const executables = await $provideExecutablesForNode(prepareAndScrapeOptions);

    executionTools = {
        llm,
        fs,
        executables,
        scrapers: await $provideScrapersForNode({ fs, llm, executables }, prepareAndScrapeOptions),
        script: await $provideScriptingForNode(prepareAndScrapeOptions),
    };

    return executionTools;
}

/**
 * TODO: [🏓] Unite `xxxForServer` and `xxxForNode` naming
 */
