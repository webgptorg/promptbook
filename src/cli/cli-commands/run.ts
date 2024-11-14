import colors from 'colors';
import type { Command as Program /* <- Note: Using Program because Command is misleading name */ } from 'commander';
import spaceTrim from 'spacetrim';
import { createPipelineExecutor } from '../../execution/createPipelineExecutor/00-createPipelineExecutor';
import { countLines } from '../../utils/expectation-counters/countLines';
import { countWords } from '../../utils/expectation-counters/countWords';
import { pipelineStringToJson } from '../../conversion/pipelineStringToJson';
import { validatePipeline } from '../../conversion/validation/validatePipeline';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { $provideExecutablesForNode } from '../../executables/$provideExecutablesForNode';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import { $provideLlmToolsForCli } from '../../llm-providers/_common/register/$provideLlmToolsForCli';
import { $provideFilesystemForNode } from '../../scrapers/_common/register/$provideFilesystemForNode';
import { $provideScrapersForNode } from '../../scrapers/_common/register/$provideScrapersForNode';
import type { PipelineString } from '../../types/PipelineString';
import { isFileExisting } from '../../utils/files/isFileExisting';
import { TODO_USE } from '../../utils/organization/TODO_USE';

/**
 * Initializes `run` command for Promptbook CLI utilities
 *
 * @private internal function of `promptbookCli`
 */
export function initializeRunCommand(program: Program) {
    const runCommand = program.command('run');
    runCommand.description(
        spaceTrim(`
            Runs a pipeline
      `),
    );

    // TODO: [🧅] DRY command arguments

    runCommand.argument(
        '<path>',
        // <- Note: [🧟‍♂️] This is NOT promptbook collection directory BUT direct path to .ptbk.md file
        'Path to `.ptbk.md` file',
    );
    runCommand.option('--reload', `Call LLM models even if same prompt with result is in the cache`, false);
    runCommand.option('--verbose', `Is output verbose`, false);

    runCommand.action(async (path, { reload: isCacheReloaded, verbose: isVerbose }) => {
        // TODO: !!!!!!! Log stages in color if verbose

        // TODO: DRY [◽]
        const options = {
            isVerbose,
            isCacheReloaded,
        }; /* <- TODO: ` satisfies PrepareAndScrapeOptions` */
        const fs = $provideFilesystemForNode(options);
        const llm = $provideLlmToolsForCli(options);
        const executables = await $provideExecutablesForNode(options);
        const tools = {
            llm,
            fs,
            scrapers: await $provideScrapersForNode({ fs, llm, executables }, options),
            script: [
                /*new JavascriptExecutionTools(options)*/
            ],
        } satisfies ExecutionTools;

        if (!(await isFileExisting(path, fs))) {
            throw new UnexpectedError(`File "${path}" does not exist`);
            // <- TODO: !!!!!! Catch and wrap all errors from CLI
        }

        const pipelineString = (await fs.readFile(path, 'utf-8')) as PipelineString;
        const pipeline = await pipelineStringToJson(pipelineString, tools);

        validatePipeline(pipeline);

        const pipelineExecutor = createPipelineExecutor({ pipeline, tools, isNotPreparedWarningSupressed: true });

        const inputParameters = {
            eventTitle: 'OpenAlt',
            eventDescription: `Konference OpenAlt vznikla v roce 2014 jako výsledek spojení konferencí LinuxAlt a Openmobility. LinuxAlt jako konference s dlouhodobou tradicí se již od roku 2006 věnovala otevřenému softwaru a technologiím. Záhy se LinuxAlt s více jak 500 návštěvníky stal největší akcí tohoto typu v České republice. Openmobility konference vznikla v roce 2010 a přinesla českým a slovenským návštěvníkům témata otevřených mobilních platforem a otevřeného hardware formou klasických přednášek a praktických workshopů. OpenAlt vychází z toho nejlepšího na LinuxAltu a Openmobility a rozšiřuje oblast svého zájmu o témata otevřených dat ve státní správě a soukromém sektoru (Open Data) a otevřeného přístupu k vědeckým informacím (Open Access). OpenAlt se věnuje také participativní a svobodné kultuře, zejména online spolupráci, učícím se komunitám a v souvislosti s tím i alternativnímu vzdělávání. Na své si přijdou i novodobí kutilové (Makers) řídící se pravidlem „Udělej si sám“ (DIY).`,
            rules: '',
        };

        // TODO: !!!!!! CLI Input

        const result = await pipelineExecutor(inputParameters, (taskProgress) => {
            // TODO: !!!!!!! Log if verbose
            console.log(taskProgress);
        });

        // assertsExecutionSuccessful(result);

        const { isSuccessful, errors, outputParameters, executionReport } = result;

        console.log({ isSuccessful, errors, outputParameters, executionReport });

        console.log(outputParameters);

        // TODO: !!!!!!! Log errors if not successful
        // TODO: !!!!!!! Log usage if verbose
        // TODO: !!!!!!! Remove all console.log s

        TODO_USE(executionReport /* <- TODO: [🧠] Allow to save execution report */);

        console.info(colors.gray('--- Result: ---'));

        for (const key of Object.keys(outputParameters)) {
            const value = outputParameters[key] || colors.grey(colors.italic('(nothing)'));
            const separator = countLines(value) > 1 || countWords(value) > 100 ? ':\n' : ': ';
            console.info(colors.green(colors.bold(key) + separator + value));
        }

        process.exit(0);
    });
}

/**
 * TODO: [🧠] Pass `maxExecutionAttempts`, `csvSettings`
 * TODO: [🥃][main] !!! Allow `ptbk run` without configuring any llm tools
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 * TODO: [🖇] What about symlinks? Maybe flag --follow-symlinks
 */
