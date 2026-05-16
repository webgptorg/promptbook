import colors from 'colors';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import prompts from 'prompts';
import { spaceTrim } from 'spacetrim';
import { getAllCommitmentsToolFunctionsForNode } from '../../../commitments/_common/getAllCommitmentsToolFunctionsForNode';
import { DEFAULT_MAX_EXECUTION_ATTEMPTS } from '../../../config';
import { validatePipeline } from '../../../conversion/validation/validatePipeline';
import { assertsError } from '../../../errors/assertsError';
import { ParseError } from '../../../errors/ParseError';
import { $provideExecutablesForNode } from '../../../executables/$provideExecutablesForNode';
import { createPipelineExecutor } from '../../../execution/createPipelineExecutor/00-createPipelineExecutor';
import type { ExecutionTools } from '../../../execution/ExecutionTools';
import type { LlmExecutionTools } from '../../../execution/LlmExecutionTools';
import type { PipelineExecutor } from '../../../execution/PipelineExecutor';
import { $llmToolsMetadataRegister } from '../../../llm-providers/_common/register/$llmToolsMetadataRegister';
import { $registeredLlmToolsMessage } from '../../../llm-providers/_common/register/$registeredLlmToolsMessage';
import type { PipelineJson } from '../../../pipeline/PipelineJson/PipelineJson';
import type { PrepareAndScrapeOptions } from '../../../prepare/PrepareAndScrapeOptions';
import { $provideFilesystemForNode } from '../../../scrapers/_common/register/$provideFilesystemForNode';
import { $provideScrapersForNode } from '../../../scrapers/_common/register/$provideScrapersForNode';
import { promptbookFetch } from '../../../scrapers/_common/utils/promptbookFetch';
import { JavascriptExecutionTools } from '../../../scripting/javascript/JavascriptExecutionTools';
import { isFileExisting } from '../../../utils/files/isFileExisting';
import { $getCompiledBook } from '../../../wizard/$getCompiledBook';
import { $provideLlmToolsForCli } from '../../common/$provideLlmToolsForCli';
import type { RunCommandCliOptions } from './runCommandAction';

/**
 * Prepares the tools, pipeline, and executor required to run one `ptbk run` invocation.
 *
 * @private internal utility of `$initializeRunCommand`
 */
export async function prepareRunCommandResources(options: {
    readonly pipelineSource?: string;
    readonly cliOptions: RunCommandCliOptions;
    readonly prepareAndScrapeOptions: Pick<PrepareAndScrapeOptions, 'isVerbose'> & {
        readonly isCacheReloaded: boolean;
    };
    readonly logStage: (stage: string) => void;
}): Promise<{
    readonly pipeline: PipelineJson;
    readonly pipelineExecutor: PipelineExecutor;
}> {
    const { pipelineSource, cliOptions, prepareAndScrapeOptions, logStage } = options;

    logStage('Preparing tools');
    const fs = $provideFilesystemForNode(prepareAndScrapeOptions);
    const llm = await provideRunLlmTools({ cliOptions, prepareAndScrapeOptions, fs });
    const resolvedPipelineSource = await resolveRunPipelineSource(pipelineSource);

    logStage('Getting the tools');
    const tools = await createRunExecutionTools({ cliOptions, prepareAndScrapeOptions, fs, llm });

    logStage('Getting the book');
    const pipeline = await compileRunPipeline({
        tools,
        pipelineSource: resolvedPipelineSource,
        prepareAndScrapeOptions,
    });

    logStage('Validating pipeline');
    // TODO: Same try-catch for LogicError
    validatePipeline(pipeline);

    logStage('Creating executor');
    const pipelineExecutor = createRunPipelineExecutor(pipeline, tools);

    return { pipeline, pipelineExecutor };
}

/**
 * Resolves LLM tools for the run command and keeps the existing `.env` bootstrap fallback.
 *
 * @private internal utility of `$initializeRunCommand`
 */
async function provideRunLlmTools(options: {
    readonly cliOptions: RunCommandCliOptions;
    readonly prepareAndScrapeOptions: Pick<PrepareAndScrapeOptions, 'isVerbose'> & {
        readonly isCacheReloaded: boolean;
    };
    readonly fs: ReturnType<typeof $provideFilesystemForNode>;
}): Promise<LlmExecutionTools> {
    const { cliOptions, prepareAndScrapeOptions, fs } = options;

    try {
        return (await $provideLlmToolsForCli({ cliOptions, ...prepareAndScrapeOptions })).llm;
    } catch (error) {
        assertsError(error);

        if (!error.message.includes('No LLM tools')) {
            throw error;
        }

        console.error(colors.red(createRunMissingLlmToolsMessage()));

        // TODO: Maybe allow to sign-in as Promptbook.studio user here

        if (!(await isFileExisting('.env', fs))) {
            await writeFile(join(process.cwd(), '.env'), createRunEnvTemplate(), 'utf8');
        }

        // TODO: If the cwd is git repository, auto-create .gitignore and add .env to it

        return process.exit(1);
    }
}

/**
 * Creates the missing-LLM setup guidance shown when no local keys are configured.
 *
 * @private internal utility of `$initializeRunCommand`
 */
function createRunMissingLlmToolsMessage(): string {
    return spaceTrim(
        (block) => `
            You need to configure LLM tools first

            1) Create .env file at the root of your project
            2) Configure API keys for LLM tools

            For example:
            ${block(
                $llmToolsMetadataRegister
                    .list()
                    .map(({ title, envVariables }) => `- ${(envVariables || []).join(' + ')} (${title})`)
                    .join('\n'),
            )}

            ${block($registeredLlmToolsMessage())}
        `,
    );
}

/**
 * Creates the starter `.env` template used when the run command bootstraps local LLM configuration.
 *
 * @private internal utility of `$initializeRunCommand`
 */
function createRunEnvTemplate(): string {
    return $llmToolsMetadataRegister
        .list()
        .flatMap(({ title, envVariables }) =>
            envVariables === null ? [] : [`# ${title}`, ...envVariables.map((varname) => `# ${varname}=...`), ''],
        )
        .join('\n');
}

/**
 * Resolves the pipeline source, prompting only when the user did not provide one.
 *
 * @private internal utility of `$initializeRunCommand`
 */
async function resolveRunPipelineSource(pipelineSource?: string): Promise<string> {
    if (pipelineSource) {
        return pipelineSource;
    }

    const response = await prompts({
        type: 'text',
        name: 'pipelineSource',
        message: '', // <- TODO: [🧠] What is the message here
        validate(value) {
            return value.length > 0 ? true : 'Pipeline source is required';
        },
    });

    if (!response.pipelineSource) {
        console.error(colors.red('Pipeline source is required'));
        return process.exit(1);
    }

    return response.pipelineSource;
}

/**
 * Collects the execution tools needed to compile and execute the selected pipeline.
 *
 * @private internal utility of `$initializeRunCommand`
 */
async function createRunExecutionTools(options: {
    readonly cliOptions: RunCommandCliOptions;
    readonly prepareAndScrapeOptions: Pick<PrepareAndScrapeOptions, 'isVerbose'> & {
        readonly isCacheReloaded: boolean;
    };
    readonly fs: ReturnType<typeof $provideFilesystemForNode>;
    readonly llm: LlmExecutionTools;
}): Promise<ExecutionTools & Required<Pick<ExecutionTools, 'fs' | 'fetch'>>> {
    const { cliOptions, prepareAndScrapeOptions, fs, llm } = options;
    const executables = await $provideExecutablesForNode(prepareAndScrapeOptions);

    return {
        llm,
        fs,
        fetch: promptbookFetch,
        scrapers: await $provideScrapersForNode({ fs, llm, executables }, prepareAndScrapeOptions),
        script: [
            new JavascriptExecutionTools({
                ...cliOptions,
                functions: getAllCommitmentsToolFunctionsForNode(),
            }),
        ],
    } satisfies ExecutionTools; /* <- Note: [🤛] */
}

/**
 * Compiles the requested book and preserves the current ParseError formatting.
 *
 * @private internal utility of `$initializeRunCommand`
 */
async function compileRunPipeline(options: {
    readonly tools: ExecutionTools & Required<Pick<ExecutionTools, 'fs' | 'fetch'>>;
    readonly pipelineSource: string;
    readonly prepareAndScrapeOptions: Pick<PrepareAndScrapeOptions, 'isVerbose'> & {
        readonly isCacheReloaded: boolean;
    };
}): Promise<PipelineJson> {
    const { tools, pipelineSource, prepareAndScrapeOptions } = options;

    try {
        return await $getCompiledBook(tools, pipelineSource, prepareAndScrapeOptions);
    } catch (error) {
        if (!(error instanceof ParseError)) {
            throw error;
        }
        const parseError = error;

        console.error(
            colors.red(
                spaceTrim(
                    (block) => `
                        ${block(parseError.message)}

                        in ${pipelineSource}
                    `,
                ),
            ),
        );

        return process.exit(1);
    }
}

/**
 * Creates the executor for the compiled pipeline with the current CLI defaults.
 *
 * @private internal utility of `$initializeRunCommand`
 */
function createRunPipelineExecutor(
    pipeline: PipelineJson,
    tools: ExecutionTools & Required<Pick<ExecutionTools, 'fs' | 'fetch'>>,
): PipelineExecutor {
    return createPipelineExecutor({
        pipeline,
        tools,
        isNotPreparedWarningSuppressed: true,
        maxExecutionAttempts: DEFAULT_MAX_EXECUTION_ATTEMPTS, // <- TODO: Pass via CLI argument
        //                          <- TODO: Why "LLM execution failed undefinedx"
        maxParallelCount: 1, // <- TODO: Pass CLI argument
    });
}

// Note: [🟡] Code for CLI command [prepareRunCommandResources](src/cli/cli-commands/run/prepareRunCommandResources.ts) should never be published outside of `@promptbook/cli`
