import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import prompts from 'prompts';
import { spaceTrim } from 'spacetrim';
import { getAllCommitmentsToolFunctionsForNode } from '../../commitments/_common/getAllCommitmentsToolFunctionsForNode';
import { DEFAULT_MAX_EXECUTION_ATTEMPTS } from '../../config';
import { validatePipeline } from '../../conversion/validation/validatePipeline';
import { assertsError } from '../../errors/assertsError';
import { ParseError } from '../../errors/ParseError';
import { $provideExecutablesForNode } from '../../executables/$provideExecutablesForNode';
import { createPipelineExecutor } from '../../execution/createPipelineExecutor/00-createPipelineExecutor';
import { executionReportJsonToString } from '../../execution/execution-report/executionReportJsonToString';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { PipelineExecutor } from '../../execution/PipelineExecutor';
import type { PipelineExecutorResult } from '../../execution/PipelineExecutorResult';
import { usageToHuman } from '../../execution/utils/usageToHuman';
import { jsonParse } from '../../formats/json/utils/jsonParse';
import { $llmToolsMetadataRegister } from '../../llm-providers/_common/register/$llmToolsMetadataRegister';
import { $registeredLlmToolsMessage } from '../../llm-providers/_common/register/$registeredLlmToolsMessage';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import { $provideFilesystemForNode } from '../../scrapers/_common/register/$provideFilesystemForNode';
import { $provideScrapersForNode } from '../../scrapers/_common/register/$provideScrapersForNode';
import { promptbookFetch } from '../../scrapers/_common/utils/promptbookFetch';
import { JavascriptExecutionTools } from '../../scripting/javascript/JavascriptExecutionTools';
import type { string_parameter_name, string_parameter_value } from '../../types/typeAliases';
import { countLines } from '../../utils/expectation-counters/countLines';
import { countWords } from '../../utils/expectation-counters/countWords';
import { isFileExisting } from '../../utils/files/isFileExisting';
import { normalizeToKebabCase } from '../../utils/normalization/normalize-to-kebab-case';
import type { $side_effect } from '../../utils/organization/$side_effect';
import type { TODO_any } from '../../utils/organization/TODO_any';
import { $getCompiledBook } from '../../wizard/$getCompiledBook';
import { $provideLlmToolsForCli } from '../common/$provideLlmToolsForCli';
import { handleActionErrors } from './common/handleActionErrors';
import { runInteractiveChatbot } from './runInteractiveChatbot';

/**
 * CLI options consumed by the `run` command action.
 *
 * @private internal utility of `$initializeRunCommand`
 */
type RunCommandCliOptions = {
    readonly reload: boolean;
    readonly interactive: boolean;
    readonly formfactor: boolean;
    readonly json?: string;
    readonly verbose: boolean;
    readonly saveReport?: string;
    readonly provider: string;
    readonly remoteServerUrl: string;
};

/**
 * Shared preparation flags reused while bootstrapping the `run` command tools.
 *
 * @private internal utility of `$initializeRunCommand`
 */
type RunPrepareAndScrapeOptions = Pick<PrepareAndScrapeOptions, 'isVerbose'> & {
    readonly isCacheReloaded: boolean;
};

/**
 * Execution tools prepared by `ptbk run`, guaranteeing the filesystem and fetch helpers needed by book loading.
 *
 * @private internal utility of `$initializeRunCommand`
 */
type RunExecutionTools = ExecutionTools & Required<Pick<ExecutionTools, 'fs' | 'fetch'>>;

/**
 * Initializes `run` command for Promptbook CLI utilities
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeRunCommand(program: Program): $side_effect {
    const runCommand = program.command('run', { isDefault: true });
    runCommand.description(
        spaceTrim(`
            Runs a pipeline
        `),
    );

    runCommand.alias('execute');

    // TODO: [🧅] DRY command arguments

    runCommand.argument('[pipelineSource]', 'Path to book file OR URL to book file, if not provided it will be asked');
    runCommand.option('-r, --reload', `Call LLM models even if same prompt with result is in the cache`, false);
    runCommand.option(
        '--no-formfactor',
        `When set, behavior of the interactive mode is not changed by the formfactor of the pipeline`,
    );
    runCommand.option(
        '-j, --json <json>',
        `Pass all or some input parameters as JSON record, if used the output is also returned as JSON`,
    );
    runCommand.option('-s, --save-report <path>', `Save report to file`);

    runCommand.action(
        handleActionErrors((pipelineSource, cliOptions) =>
            runCommandAction(pipelineSource, cliOptions as RunCommandCliOptions),
        ),
    );
}

/**
 * Runs the whole `ptbk run` flow as a top-down orchestration of focused steps.
 *
 * @private internal utility of `$initializeRunCommand`
 */
async function runCommandAction(pipelineSource: string, cliOptions: RunCommandCliOptions): Promise<void | never> {
    const {
        reload: isCacheReloaded,
        interactive: isInteractive,
        formfactor: isFormfactorUsed,
        json,
        verbose: isVerbose,
        saveReport,
    } = cliOptions;

    assertRunCommandArguments(pipelineSource, saveReport);

    let inputParameters = parseRunInputParameters(json);
    const prepareAndScrapeOptions = createRunPrepareAndScrapeOptions({ isVerbose, isCacheReloaded });

    logRunStage(isVerbose, 'Preparing tools');
    const fs = $provideFilesystemForNode(prepareAndScrapeOptions);
    const llm = await provideRunLlmTools({ cliOptions, prepareAndScrapeOptions, fs });

    const resolvedPipelineSource = await resolveRunPipelineSource(pipelineSource);

    logRunStage(isVerbose, 'Getting the tools');
    const tools = await createRunExecutionTools({ cliOptions, prepareAndScrapeOptions, fs, llm });

    logRunStage(isVerbose, 'Getting the book');
    const pipeline = await compileRunPipeline({
        tools,
        pipelineSource: resolvedPipelineSource,
        prepareAndScrapeOptions,
    });

    logRunStage(isVerbose, 'Validating pipeline');
    // TODO: Same try-catch for LogicError
    validatePipeline(pipeline);

    logRunStage(isVerbose, 'Creating executor');
    const pipelineExecutor = createRunPipelineExecutor(pipeline, tools);

    // TODO: Make some better system for formfactors and interactive mode - here is just a quick hardcoded solution for chatbot
    if (shouldRunInteractiveChatbot({ isInteractive, isFormfactorUsed, pipeline })) {
        return /* not await */ runInteractiveChatbot({ pipeline, pipelineExecutor, isVerbose });
    }

    logRunStage(isVerbose, 'Getting input parameters');
    inputParameters = await resolveRunInputParameters({ pipeline, inputParameters, isInteractive });

    logRunStage(isVerbose, 'Executing');
    const executionResult = await executeRunPipeline({ pipelineExecutor, inputParameters, isVerbose });

    await saveRunExecutionReport({ executionReport: executionResult.executionReport, saveReport });

    if (saveReport && isVerbose) {
        console.info(colors.green(`Report saved to ${saveReport}`));
    }

    printRunExecutionResult({ executionResult, json, isVerbose });

    return process.exit(0);
}

/**
 * Validates the up-front CLI arguments before any expensive preparation starts.
 *
 * @private internal utility of `$initializeRunCommand`
 */
function assertRunCommandArguments(pipelineSource: string, saveReport?: string): void | never {
    if (pipelineSource.includes('-') && normalizeToKebabCase(pipelineSource) === pipelineSource) {
        console.error(colors.red(`""${pipelineSource}" is not a valid command or book. See 'ptbk --help'.`));
        return process.exit(1);
    }

    if (saveReport && !saveReport.endsWith('.json') && !saveReport.endsWith('.md')) {
        console.error(colors.red(`Report file must be .json or .md`));
        return process.exit(1);
    }
}

/**
 * Parses the optional JSON input payload into run input parameters.
 *
 * @private internal utility of `$initializeRunCommand`
 */
function parseRunInputParameters(json?: string): Record<string_parameter_name, string_parameter_value> {
    if (!json) {
        return {};
    }

    return jsonParse(json);
    //    <- TODO: Maybe check shape of passed JSON and if its valid parameters Record
}

/**
 * Creates the shared preparation flags reused across filesystem, LLM, and scraper setup.
 *
 * @private internal utility of `$initializeRunCommand`
 */
function createRunPrepareAndScrapeOptions(options: {
    readonly isVerbose: boolean;
    readonly isCacheReloaded: boolean;
}): RunPrepareAndScrapeOptions {
    const { isVerbose, isCacheReloaded } = options;

    return {
        isVerbose,
        isCacheReloaded,
    };
}

/**
 * Prints a verbose stage banner for the current `ptbk run` step.
 *
 * @private internal utility of `$initializeRunCommand`
 */
function logRunStage(isVerbose: boolean, stage: string): void {
    if (isVerbose) {
        console.info(colors.gray(`--- ${stage} ---`));
    }
}

/**
 * Resolves LLM tools for the run command and keeps the existing `.env` bootstrap fallback.
 *
 * @private internal utility of `$initializeRunCommand`
 */
async function provideRunLlmTools(options: {
    readonly cliOptions: RunCommandCliOptions;
    readonly prepareAndScrapeOptions: RunPrepareAndScrapeOptions;
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
    readonly prepareAndScrapeOptions: RunPrepareAndScrapeOptions;
    readonly fs: ReturnType<typeof $provideFilesystemForNode>;
    readonly llm: LlmExecutionTools;
}): Promise<RunExecutionTools> {
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
    readonly tools: RunExecutionTools;
    readonly pipelineSource: string;
    readonly prepareAndScrapeOptions: RunPrepareAndScrapeOptions;
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
function createRunPipelineExecutor(pipeline: PipelineJson, tools: ExecutionTools): PipelineExecutor {
    return createPipelineExecutor({
        pipeline,
        tools,
        isNotPreparedWarningSuppressed: true,
        maxExecutionAttempts: DEFAULT_MAX_EXECUTION_ATTEMPTS, // <- TODO: Pass via CLI argument
        //                          <- TODO: Why "LLM execution failed undefinedx"
        maxParallelCount: 1, // <- TODO: Pass CLI argument
    });
}

/**
 * Determines whether the run flow should switch into the dedicated chatbot loop.
 *
 * @private internal utility of `$initializeRunCommand`
 */
function shouldRunInteractiveChatbot(options: {
    readonly isInteractive: boolean;
    readonly isFormfactorUsed: boolean;
    readonly pipeline: PipelineJson;
}): boolean {
    const { isInteractive, isFormfactorUsed, pipeline } = options;

    return isInteractive === true && isFormfactorUsed === true && pipeline.formfactorName === 'CHATBOT';
}

/**
 * Resolves all missing input parameters while keeping the current interactive and non-interactive behavior.
 *
 * @private internal utility of `$initializeRunCommand`
 */
async function resolveRunInputParameters(options: {
    readonly pipeline: PipelineJson;
    readonly inputParameters: Record<string_parameter_name, string_parameter_value>;
    readonly isInteractive: boolean;
}): Promise<Record<string_parameter_name, string_parameter_value>> {
    const { pipeline, inputParameters, isInteractive } = options;
    const questions = createRunInputQuestions(pipeline, inputParameters);

    if (isInteractive === false && questions.length !== 0) {
        console.error(colors.red(createRunMissingInputParametersMessage(pipeline, inputParameters, questions)));
        return process.exit(1);
    }

    const response = await prompts(questions as TODO_any);
    //                     <- TODO: [🧠][🍼] Change behavior according to the formfactor

    return { ...inputParameters, ...response };
    //      <- TODO: Maybe do some validation of the response (and --json argument which is passed)
}

/**
 * Builds prompt questions for all missing input parameters of the pipeline.
 *
 * @private internal utility of `$initializeRunCommand`
 */
function createRunInputQuestions(
    pipeline: PipelineJson,
    inputParameters: Record<string_parameter_name, string_parameter_value>,
): Array<TODO_any> {
    return pipeline.parameters
        .filter(({ isInput }) => isInput)
        .filter(({ name }) => typeof inputParameters[name] !== 'string')
        .map(({ name, exampleValues }) => {
            let message = name;
            let initial = '';

            if (exampleValues && exampleValues.length > 0) {
                const exampleValuesFiltered = exampleValues.filter((exampleValue) => countLines(exampleValue) <= 1);

                if (exampleValuesFiltered.length !== 0) {
                    message += ` (e.g. ${exampleValuesFiltered.join(', ')})`;
                }

                initial = exampleValues[0] || '';
            }

            return {
                type: 'text',
                name,
                message,
                initial,
                // TODO: Maybe use> validate: value => value < 18 ? `Forbidden` : true
            };
        });
}

/**
 * Creates the existing non-interactive error message for missing input parameters.
 *
 * @private internal utility of `$initializeRunCommand`
 */
function createRunMissingInputParametersMessage(
    pipeline: PipelineJson,
    inputParameters: Record<string_parameter_name, string_parameter_value>,
    questions: Array<TODO_any>,
): string {
    return spaceTrim(
        (block) => `
            When using --no-interactive you need to pass all the input parameters through --json

            You are missing:
            ${block(
                pipeline.parameters
                    .filter(({ isInput }) => isInput)
                    .filter(
                        ({ name: parameterName }) =>
                            !questions.some(({ name: questionName }) => questionName === parameterName),
                    )
                    .map(({ name, description }) => `- **${name}** ${description}`)
                    .join('\n'),
            )}

            Example:
            --json '${createRunJsonInputExample(pipeline, inputParameters)}'
        `,
    );
}

/**
 * Creates the example JSON payload shown for missing non-interactive input parameters.
 *
 * @private internal utility of `$initializeRunCommand`
 */
function createRunJsonInputExample(
    pipeline: PipelineJson,
    inputParameters: Record<string_parameter_name, string_parameter_value>,
): string {
    return JSON.stringify(
        Object.fromEntries(
            pipeline.parameters
                .filter(({ isInput }) => isInput)
                .map(({ name, exampleValues }) => [name, inputParameters[name] || (exampleValues || [])[0] || '...']),
        ),
    )
        .split("'")
        .join("\\'");
}

/**
 * Executes the pipeline and keeps the current verbose progress and detail logging.
 *
 * @private internal utility of `$initializeRunCommand`
 */
async function executeRunPipeline(options: {
    readonly pipelineExecutor: PipelineExecutor;
    readonly inputParameters: Record<string_parameter_name, string_parameter_value>;
    readonly isVerbose: boolean;
}): Promise<PipelineExecutorResult> {
    const { pipelineExecutor, inputParameters, isVerbose } = options;
    const executionTask = pipelineExecutor(inputParameters);

    if (isVerbose) {
        executionTask.asObservable().subscribe((partialResult) => {
            console.info(colors.gray('--- Progress ---'));
            console.info(
                partialResult,
                // <- TODO: Pretty print taskProgress
            );
        });
    }

    const executionResult = await executionTask.asPromise({
        isCrashedOnError: false,
    });

    if (isVerbose) {
        const { isSuccessful, errors, warnings, outputParameters, executionReport } = executionResult;

        console.info(colors.gray('--- Detailed Result ---'));
        console.info(
            { isSuccessful, errors, warnings, outputParameters, executionReport },
            // <- TODO: Pretty print taskProgress
        );
    }

    return executionResult;
}

/**
 * Persists the execution report when the caller requested `--save-report`.
 *
 * @private internal utility of `$initializeRunCommand`
 */
async function saveRunExecutionReport(options: {
    readonly executionReport: PipelineExecutorResult['executionReport'];
    readonly saveReport?: string;
}): Promise<void> {
    const { executionReport, saveReport } = options;

    if (executionReport !== null && saveReport && saveReport.endsWith('.json')) {
        await writeFile(saveReport, JSON.stringify(executionReport, null, 4) + '\n', 'utf-8');
    } else if (executionReport !== null && saveReport && saveReport.endsWith('.md')) {
        const executionReportString = executionReportJsonToString(executionReport);
        await writeFile(saveReport, executionReportString, 'utf-8');
    }
}

/**
 * Prints the final usage, errors, warnings, and output parameters for the run command.
 *
 * @private internal utility of `$initializeRunCommand`
 */
function printRunExecutionResult(options: {
    readonly executionResult: PipelineExecutorResult;
    readonly json?: string;
    readonly isVerbose: boolean;
}): void {
    const {
        executionResult: { errors, warnings, outputParameters, usage },
        json,
        isVerbose,
    } = options;

    if (isVerbose) {
        console.info(colors.gray('--- Usage ---'));
        console.info(colors.cyan(usageToHuman(usage)));
    }

    if (json === undefined || isVerbose === true) {
        console.info(colors.gray('--- Result ---'));
    }

    // TODO: [🧠] Should be errors or warnings shown first

    for (const error of errors || []) {
        console.error(colors.red(colors.bold(error.name) + ': ' + error.message));
    }

    for (const warning of warnings || []) {
        console.error(colors.red(colors.bold(warning.name) + ': ' + warning.message));
    }

    if (json === undefined) {
        printRunHumanOutputParameters(outputParameters);
    } else {
        console.info(
            JSON.stringify(
                outputParameters,
                null,
                4,
                // <- TODO: Allow to set --pretty
            ),
        );
    }
}

/**
 * Prints human-readable output parameters with the existing short-versus-multiline formatting.
 *
 * @private internal utility of `$initializeRunCommand`
 */
function printRunHumanOutputParameters(outputParameters: PipelineExecutorResult['outputParameters']): void {
    for (const key of Object.keys(outputParameters)) {
        const value = outputParameters[key] || colors.grey(colors.italic('(nothing)'));
        const separator = countLines(value) > 1 || countWords(value) > 100 ? ':\n' : ': ';
        console.info(colors.green(colors.bold(key) + separator + value));
    }
}

// Note: [🟡] Code for CLI command [run](src/cli/cli-commands/run.ts) should never be published outside of `@promptbook/cli`
// TODO: !!5 Catch and wrap all errors from CLI
// TODO: [🧠] Pass `maxExecutionAttempts`, `csvSettings`
// TODO: [🥃][main] !!3 Allow `ptbk run` without configuring any llm tools
// Note: [💞] Ignore a discrepancy between file name and entity name
// TODO: [🖇] What about symlinks? Maybe flag --follow-symlinks
