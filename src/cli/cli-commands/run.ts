import colors from 'colors';
import type { Command as Program /* <- Note: Using Program because Command is misleading name */ } from 'commander';
import prompts from 'prompts';
import spaceTrim from 'spacetrim';
import { forTime } from 'waitasecond';
import { pipelineStringToJson } from '../../conversion/pipelineStringToJson';
import { validatePipeline } from '../../conversion/validation/validatePipeline';
import { $provideExecutablesForNode } from '../../executables/$provideExecutablesForNode';
import { createPipelineExecutor } from '../../execution/createPipelineExecutor/00-createPipelineExecutor';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import { $provideLlmToolsForCli } from '../../llm-providers/_common/register/$provideLlmToolsForCli';
import { $provideFilesystemForNode } from '../../scrapers/_common/register/$provideFilesystemForNode';
import { $provideScrapersForNode } from '../../scrapers/_common/register/$provideScrapersForNode';
import type { PipelineString } from '../../types/PipelineString';
import { string_filename } from '../../types/typeAliases';
import { countLines } from '../../utils/expectation-counters/countLines';
import { countWords } from '../../utils/expectation-counters/countWords';
import { isFileExisting } from '../../utils/files/isFileExisting';
import type { TODO_any } from '../../utils/organization/TODO_any';
import { TODO_USE } from '../../utils/organization/TODO_USE';

/**
 * Initializes `run` command for Promptbook CLI utilities
 *
 * @private internal function of `promptbookCli`
 */
export function initializeRunCommand(program: Program) {
    const runCommand = program.command('run', { isDefault: true });
    runCommand.description(
        spaceTrim(`
            Runs a pipeline
      `),
    );

    // TODO: [🧅] DRY command arguments

    runCommand.argument(
        '<path>',
        // <- Note: [🧟‍♂️] This is NOT promptbook collection directory BUT direct path to .ptbk.md file
        'Path to book file',
    );
    runCommand.option('-r, --reload', `Call LLM models even if same prompt with result is in the cache`, false);
    runCommand.option('-v, --verbose', `Is output verbose`, false);
    runCommand.option('--no-interactive', `Input is not interactive`, false);

    // TODO: !!!!!! Interactive mode
    // TODO: !!!!!! JSON output
    // TODO: !!!!!! Save report = json/md

    runCommand.action(async (filePathRaw, options) => {
        // TODO: !!!!!!! Log stages in color if verbose

        const { reload: isCacheReloaded, interactive: isInteractive, verbose: isVerbose } = options;

        TODO_USE(isInteractive);

        // TODO: DRY [◽]
        const prepareAndScrapeOptions = {
            isVerbose,
            isCacheReloaded,
        }; /* <- TODO: ` satisfies PrepareAndScrapeOptions` */

        await forTime(10000);

        const fs = $provideFilesystemForNode(prepareAndScrapeOptions);

        let filePath: string_filename | null = null;
        const filePathCandidates = [
            filePathRaw,
            `${filePathRaw}.md`,
            `${filePathRaw}.book.md`,
            `${filePathRaw}.ptbk.md`,
        ];

        for (const filePathCandidate of filePathCandidates) {
            if (
                await isFileExisting(filePathCandidate, fs)
                // <- TODO: Also test that among the candidates the file is book not just any file
            ) {
                filePath = filePathCandidate;
                break;
            }
        }

        if (filePath === null) {
            console.error(colors.red(`File "${filePathRaw}" does not exist`));
            return process.exit(1);
        }

        let llm: LlmExecutionTools;

        try {
            llm = $provideLlmToolsForCli(prepareAndScrapeOptions);
        } catch (error) {
            if (!(error instanceof Error)) {
                throw error;
            }
            if (!error.message.includes('No LLM tools')) {
                throw error;
            }

            console.error(
                colors.red(
                    spaceTrim(`
                        You need to configure LLM tools first

                        1) Create .env file
                        2) Add OPENAI_API_KEY=...
                        3) *(and/or)* Add ANTHROPIC_CLAUDE_API_KEY=...
                    `),
                    // <- TODO: List configuration keys dynamically
                ),
            );
            return process.exit(1);
        }

        const executables = await $provideExecutablesForNode(prepareAndScrapeOptions);
        const tools = {
            llm,
            fs,
            scrapers: await $provideScrapersForNode({ fs, llm, executables }, prepareAndScrapeOptions),
            script: [
                /*new JavascriptExecutionTools(options)*/
            ],
        } satisfies ExecutionTools;

        const pipelineString = (await fs.readFile(filePath, 'utf-8')) as PipelineString;
        const pipeline = await pipelineStringToJson(pipelineString, tools);

        validatePipeline(pipeline);

        const questions = pipeline.parameters
            .filter(({ isInput }) => isInput)
            .map(({ name }) => ({
                type: 'text',
                name: name,
                message: name,
                // TODO: Maybe use> validate: value => value < 18 ? `Forbidden` : true
            }));

        const response = await prompts(questions as TODO_any);

        // TODO: Maybe do some validation of the response

        const inputParameters = response;

        await forTime(100);

        const pipelineExecutor = createPipelineExecutor({
            pipeline,
            tools,
            isNotPreparedWarningSupressed: true,
            maxExecutionAttempts: 3, // <- TODO: !!!!!! Pass
            //                          <- TODO: !!!!!! Why "LLM execution failed undefinedx"
            maxParallelCount: 1, // <- TODO: !!!!!! Pass
        });

        const result = await pipelineExecutor(inputParameters, (taskProgress) => {
            if (isVerbose) {
                // TODO: !!!!!!! Pretty print taskProgress
                console.log(taskProgress);
            }
        });

        // assertsExecutionSuccessful(result);

        const { isSuccessful, errors, warnings, outputParameters, executionReport } = result;

        if (isVerbose) {
            // TODO: !!!!!!! Pretty print
            console.log({ isSuccessful, errors, warnings, outputParameters, executionReport });
            console.log(outputParameters);
        }

        // TODO: !!!!!!! Log usage if verbose
        // TODO: !!!!!!! Remove all console.log(s)  and replace with pretty print console.info(s)

        TODO_USE(executionReport /* <- TODO: [🧠] Allow to save execution report */);

        console.info(colors.gray('--- Result: ---'));

        // TODO: [🧠] Should be errors or warnings shown first

        for (const error of errors || []) {
            console.error(colors.red(colors.bold(error.name) + ': ' + error.message));
        }

        for (const warning of warnings || []) {
            console.error(colors.red(colors.bold(warning.name) + ': ' + warning.message));
        }

        for (const key of Object.keys(outputParameters)) {
            const value = outputParameters[key] || colors.grey(colors.italic('(nothing)'));
            const separator = countLines(value) > 1 || countWords(value) > 100 ? ':\n' : ': ';
            console.info(colors.green(colors.bold(key) + separator + value));
        }

        return process.exit(0);
    });
}

/**
 * TODO: !!!!!! Catch and wrap all errors from CLI
 * TODO: [🧠] Pass `maxExecutionAttempts`, `csvSettings`
 * TODO: [🥃][main] !!! Allow `ptbk run` without configuring any llm tools
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 * TODO: [🖇] What about symlinks? Maybe flag --follow-symlinks
 */
