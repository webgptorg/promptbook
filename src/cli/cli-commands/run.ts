import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import prompts from 'prompts';
import spaceTrim from 'spacetrim';
import { DEFAULT_MAX_EXECUTION_ATTEMPTS } from '../../config';
import { validatePipeline } from '../../conversion/validation/validatePipeline';
import { assertsError } from '../../errors/assertsError';
import { ParseError } from '../../errors/ParseError';
import { $provideExecutablesForNode } from '../../executables/$provideExecutablesForNode';
import { createPipelineExecutor } from '../../execution/createPipelineExecutor/00-createPipelineExecutor';
import { executionReportJsonToString } from '../../execution/execution-report/executionReportJsonToString';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import { usageToHuman } from '../../execution/utils/usageToHuman';
import { jsonParse } from '../../formats/json/utils/jsonParse';
import { $llmToolsMetadataRegister } from '../../llm-providers/_common/register/$llmToolsMetadataRegister';
import { $registeredLlmToolsMessage } from '../../llm-providers/_common/register/$registeredLlmToolsMessage';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
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
        handleActionErrors(async (pipelineSource, cliOptions) => {
            const {
                reload: isCacheReloaded,
                interactive: isInteractive,
                formfactor: isFormfactorUsed,
                json,
                verbose: isVerbose,
                saveReport,
            } = cliOptions;

            if (pipelineSource.includes('-') && normalizeToKebabCase(pipelineSource) === pipelineSource) {
                console.error(colors.red(`""${pipelineSource}" is not a valid command or book. See 'ptbk --help'.`));
                return process.exit(1);
            }

            if (saveReport && !saveReport.endsWith('.json') && !saveReport.endsWith('.md')) {
                console.error(colors.red(`Report file must be .json or .md`));
                return process.exit(1);
            }

            let inputParameters: Record<string_parameter_name, string_parameter_value> = {};

            if (json) {
                inputParameters = jsonParse(json);
                //                <- TODO: Maybe check shape of passed JSON and if its valid parameters Record
            }

            // TODO: DRY [◽]
            const prepareAndScrapeOptions = {
                isVerbose,
                isCacheReloaded,
            }; /* <- TODO: ` satisfies PrepareAndScrapeOptions` */

            if (isVerbose) {
                console.info(colors.gray('--- Preparing tools ---'));
            }

            const fs = $provideFilesystemForNode(prepareAndScrapeOptions);

            let llm: LlmExecutionTools;

            try {
                llm = (await $provideLlmToolsForCli({ cliOptions, ...prepareAndScrapeOptions })).llm;
            } catch (error) {
                assertsError(error);

                if (!error.message.includes('No LLM tools')) {
                    throw error;
                }

                console.error(
                    colors.red(
                        spaceTrim(
                            (block) => `
                            You need to configure LLM tools first

                            1) Create .env file at the root of your project
                            2) Configure API keys for LLM tools

                            For example:
                            ${block(
                                $llmToolsMetadataRegister
                                    .list()
                                    .map(
                                        ({ title, envVariables }) => `- ${(envVariables || []).join(' + ')} (${title})`,
                                    )
                                    .join('\n'),
                            )}

                            ${block($registeredLlmToolsMessage())}
                        `,
                        ),
                    ),
                );

                // TODO: Maybe allow to sign-in as Promptbook.studio user here

                if (!(await isFileExisting('.env', fs))) {
                    await writeFile(
                        join(process.cwd(), '.env'),
                        $llmToolsMetadataRegister
                            .list()
                            .flatMap(({ title, envVariables }) =>
                                envVariables === null
                                    ? []
                                    : [`# ${title}`, ...envVariables.map((varname) => `# ${varname}=...`), ''],
                            )
                            .join('\n'),
                        'utf8',
                    );
                }

                // TODO: If the cwd is git repository, auto-create .gitignore and add .env to it

                return process.exit(1);
            }

            if (!pipelineSource) {
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

                pipelineSource = response.pipelineSource;
            }

            if (isVerbose) {
                console.info(colors.gray('--- Getting the tools ---'));
            }

            const executables = await $provideExecutablesForNode(prepareAndScrapeOptions);
            const tools = {
                llm,
                fs,
                fetch: promptbookFetch,
                scrapers: await $provideScrapersForNode({ fs, llm, executables }, prepareAndScrapeOptions),
                script: [new JavascriptExecutionTools(cliOptions)],
            } satisfies ExecutionTools; /* <- Note: [🤛] */

            if (isVerbose) {
                console.info(colors.gray('--- Getting the book ---'));
            }

            let pipeline: PipelineJson;
            try {
                pipeline = await $getCompiledBook(tools, pipelineSource, prepareAndScrapeOptions);
            } catch (error) {
                if (!(error instanceof ParseError)) {
                    throw error;
                }

                console.error(
                    colors.red(
                        spaceTrim(
                            (block) => `
                            ${block((error as ParseError).message)}

                            in ${pipelineSource}
                        `,
                        ),
                    ),
                );
                return process.exit(1);
            }

            if (isVerbose) {
                console.info(colors.gray('--- Validating pipeline ---'));
            }

            // TODO: Same try-catch for LogicError
            validatePipeline(pipeline);

            if (isVerbose) {
                console.info(colors.gray('--- Creating executor ---'));
            }

            const pipelineExecutor = createPipelineExecutor({
                pipeline,
                tools,
                isNotPreparedWarningSuppressed: true,
                maxExecutionAttempts: DEFAULT_MAX_EXECUTION_ATTEMPTS, // <- TODO: Pass via CLI argument
                //                          <- TODO: Why "LLM execution failed undefinedx"
                maxParallelCount: 1, // <- TODO: Pass CLI argument
            });

            // TODO: Make some better system for formfactors and interactive mode - here is just a quick hardcoded solution for chatbot
            if (isInteractive === true && isFormfactorUsed === true && pipeline.formfactorName === 'CHATBOT') {
                return /* not await */ runInteractiveChatbot({ pipeline, pipelineExecutor, isVerbose });
            }

            if (isVerbose) {
                console.info(colors.gray('--- Getting input parameters ---'));
            }

            const questions = pipeline.parameters
                .filter(({ isInput }) => isInput)
                .filter(({ name }) => typeof inputParameters[name] !== 'string')
                .map(({ name, exampleValues }) => {
                    let message = name;
                    let initial = '';

                    if (exampleValues && exampleValues.length > 0) {
                        const exampleValuesFiltered = exampleValues.filter(
                            (exampleValue) => countLines(exampleValue) <= 1,
                        );

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

            if (isInteractive === false && questions.length !== 0) {
                console.error(
                    colors.red(
                        spaceTrim(
                            (block) => `
                              When using --no-interactive you need to pass all the input parameters through --json

                              You are missing:
                              ${block(
                                  pipeline.parameters
                                      .filter(({ isInput }) => isInput)
                                      .filter(
                                          ({ name: parameterName }) =>
                                              !questions.some(
                                                  ({ name: questionName }) => questionName === parameterName,
                                              ),
                                      )
                                      .map(({ name, description }) => `- **${name}** ${description}`)
                                      .join('\n'),
                              )}

                              Example:
                              --json '${JSON.stringify(
                                  Object.fromEntries(
                                      pipeline.parameters
                                          .filter(({ isInput }) => isInput)
                                          .map(({ name, exampleValues }) => [
                                              name,
                                              inputParameters[name] || (exampleValues || [])[0] || '...',
                                          ]),
                                  ),
                              )
                                  .split("'")
                                  .join("\\'")}'
                        `,
                        ),
                    ),
                );
                return process.exit(1);
            }

            const response = await prompts(questions as TODO_any);
            //                     <- TODO: [🧠][🍼] Change behavior according to the formfactor
            inputParameters = { ...inputParameters, ...response };

            // TODO: Maybe do some validation of the response (and --json argument which is passed)

            if (isVerbose) {
                console.info(colors.gray('--- Executing ---'));
            }

            const executionTask = await pipelineExecutor(inputParameters);

            if (isVerbose) {
                executionTask.asObservable().subscribe((partialResult) => {
                    console.info(colors.gray('--- Progress ---'));
                    console.info(
                        partialResult,
                        // <- TODO: Pretty print taskProgress
                    );
                });
            }

            const { isSuccessful, errors, warnings, outputParameters, executionReport, usage } =
                await executionTask.asPromise({
                    isCrashedOnError: false,
                });

            if (isVerbose) {
                console.info(colors.gray('--- Detailed Result ---'));

                console.info(
                    { isSuccessful, errors, warnings, outputParameters, executionReport },
                    // <- TODO: Pretty print taskProgress
                );
            }

            if (executionReport !== null && saveReport && saveReport.endsWith('.json')) {
                await writeFile(saveReport, JSON.stringify(executionReport, null, 4) + '\n', 'utf-8');
            } else if (executionReport !== null && saveReport && saveReport.endsWith('.md')) {
                const executionReportString = executionReportJsonToString(executionReport);
                await writeFile(saveReport, executionReportString, 'utf-8');
            }

            if (saveReport && isVerbose) {
                console.info(colors.green(`Report saved to ${saveReport}`));
            }

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
                for (const key of Object.keys(outputParameters)) {
                    const value = outputParameters[key] || colors.grey(colors.italic('(nothing)'));
                    const separator = countLines(value) > 1 || countWords(value) > 100 ? ':\n' : ': ';
                    console.info(colors.green(colors.bold(key) + separator + value));
                }
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

            return process.exit(0);
        }),
    );
}

/**
 * TODO: !!5 Catch and wrap all errors from CLI
 * TODO: [🧠] Pass `maxExecutionAttempts`, `csvSettings`
 * TODO: [🥃][main] !!3 Allow `ptbk run` without configuring any llm tools
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 * TODO: [🖇] What about symlinks? Maybe flag --follow-symlinks
 */
