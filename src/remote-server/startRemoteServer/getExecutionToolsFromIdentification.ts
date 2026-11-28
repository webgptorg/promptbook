import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import { $provideExecutablesForNode } from '../../executables/$provideExecutablesForNode';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import { createLlmToolsFromConfiguration } from '../../llm-providers/_common/register/createLlmToolsFromConfiguration';
import { $provideFilesystemForNode } from '../../scrapers/_common/register/$provideFilesystemForNode';
import { $provideScrapersForNode } from '../../scrapers/_common/register/$provideScrapersForNode';
import { $provideScriptingForNode } from '../../scrapers/_common/register/$provideScriptingForNode';
import { promptbookFetch } from '../../scrapers/_common/utils/promptbookFetch';
import type { Identification } from '../socket-types/_subtypes/Identification';
import type { StartRemoteServerConfiguration } from './StartRemoteServerConfiguration';

/**
 * Builds execution tools for a single incoming identification.
 *
 * @private internal utility of `startRemoteServer`
 */
export async function getExecutionToolsFromIdentification<TCustomOptions>(
    configuration: StartRemoteServerConfiguration<TCustomOptions>,
    identification: Identification<TCustomOptions> | null | undefined,
): Promise<ExecutionTools & { llm: LlmExecutionTools }> {
    assertIdentificationProvided(identification);
    assertIdentificationModeAllowed(configuration, identification);

    const llm = await createLlmExecutionToolsForIdentification(configuration, identification);
    const customExecutionTools = await createCustomExecutionTools(configuration, identification);

    return await resolveExecutionTools(customExecutionTools, llm);
}

/**
 * Ensures that a request contains identification before resolving tools.
 */
function assertIdentificationProvided<TCustomOptions>(
    identification: Identification<TCustomOptions> | null | undefined,
): asserts identification is Identification<TCustomOptions> {
    if (identification === null || identification === undefined) {
        throw new Error(`Identification is not provided`);
    }
}

/**
 * Verifies that the requested remote-server mode is enabled.
 */
function assertIdentificationModeAllowed<TCustomOptions>(
    configuration: StartRemoteServerConfiguration<TCustomOptions>,
    identification: Identification<TCustomOptions>,
): void {
    if (identification.isAnonymous === true && !configuration.isAnonymousModeAllowed) {
        throw new PipelineExecutionError(`Anonymous mode is not allowed`); // <- TODO: [main] !!3 Test
    }

    if (identification.isAnonymous === false && !configuration.isApplicationModeAllowed) {
        throw new PipelineExecutionError(`Application mode is not allowed`); // <- TODO: [main] !!3 Test
    }

    // TODO: [main] !!4 Validate here userId (pass validator as dependency)
}

/**
 * Creates LLM tools according to the selected anonymous or application mode.
 */
async function createLlmExecutionToolsForIdentification<TCustomOptions>(
    configuration: StartRemoteServerConfiguration<TCustomOptions>,
    identification: Identification<TCustomOptions>,
): Promise<LlmExecutionTools> {
    if (identification.isAnonymous === true) {
        const { userId, llmToolsConfiguration } = identification;

        return createLlmToolsFromConfiguration(llmToolsConfiguration, {
            title: `LLM Tools for anonymous user "${userId}" on server`,
            isVerbose: configuration.isVerbose,
        });
    }

    if (configuration.createLlmExecutionTools !== null) {
        return await configuration.createLlmExecutionTools(identification);
    }

    throw new PipelineExecutionError(
        `You must provide either llmToolsConfiguration or non-anonymous mode must be properly configured`,
    );
}

/**
 * Loads caller-provided custom execution tools, if any.
 */
async function createCustomExecutionTools<TCustomOptions>(
    configuration: StartRemoteServerConfiguration<TCustomOptions>,
    identification: Identification<TCustomOptions>,
): Promise<Partial<Omit<ExecutionTools, 'llm'>>> {
    return configuration.createExecutionTools ? await configuration.createExecutionTools(identification) : {};
}

/**
 * Fills missing execution tools with the standard Node.js defaults.
 */
async function resolveExecutionTools(
    customExecutionTools: Partial<Omit<ExecutionTools, 'llm'>>,
    llm: LlmExecutionTools,
): Promise<ExecutionTools & { llm: LlmExecutionTools }> {
    const fs = customExecutionTools.fs || $provideFilesystemForNode();
    const executables = customExecutionTools.executables || (await $provideExecutablesForNode());
    const scrapers = customExecutionTools.scrapers || (await $provideScrapersForNode({ fs, llm, executables }));
    const script = customExecutionTools.script || (await $provideScriptingForNode({}));
    const fetch = customExecutionTools.fetch || promptbookFetch;
    const userInterface = customExecutionTools.userInterface || undefined;

    return {
        llm,
        fs,
        scrapers,
        script,
        fetch,
        userInterface,
    } satisfies ExecutionTools;
}
