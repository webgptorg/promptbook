import colors from 'colors';
import type { PipelineJson } from '../../../pipeline/PipelineJson/PipelineJson';
import type { PrepareAndScrapeOptions } from '../../../prepare/PrepareAndScrapeOptions';
import type { string_parameter_name, string_parameter_value } from '../../../types/string_name';
import { jsonParse } from '../../../formats/json/utils/jsonParse';
import { normalizeToKebabCase } from '../../../utils/normalization/normalize-to-kebab-case';
import { runInteractiveChatbot } from '../runInteractiveChatbot';
import { prepareRunCommandResources } from './prepareRunCommandResources';
import { resolveRunInputParameters } from './resolveRunInputParameters';
import { runPipelineExecution } from './runPipelineExecution';

/**
 * CLI options consumed by the `run` command action.
 *
 * @private internal utility of `$initializeRunCommand`
 */
export type RunCommandCliOptions = {
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
 * Runs the whole `ptbk run` flow as a top-down orchestration of focused steps.
 *
 * @private internal utility of `$initializeRunCommand`
 */
export async function runCommandAction(
    pipelineSource: string | undefined,
    cliOptions: RunCommandCliOptions,
): Promise<void | never> {
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
    const logStage = (stage: string) => logRunStage(isVerbose, stage);

    const { pipeline, pipelineExecutor } = await prepareRunCommandResources({
        pipelineSource,
        cliOptions,
        prepareAndScrapeOptions,
        logStage,
    });

    // TODO: Make some better system for formfactors and interactive mode - here is just a quick hardcoded solution for chatbot
    if (shouldRunInteractiveChatbot({ isInteractive, isFormfactorUsed, pipeline })) {
        return /* not await */ runInteractiveChatbot({ pipeline, pipelineExecutor, isVerbose });
    }

    logStage('Getting input parameters');
    inputParameters = await resolveRunInputParameters({ pipeline, inputParameters, isInteractive });

    logStage('Executing');
    await runPipelineExecution({
        pipelineExecutor,
        inputParameters,
        isVerbose,
        json,
        saveReport,
    });

    return process.exit(0);
}

/**
 * Validates the up-front CLI arguments before any expensive preparation starts.
 *
 * @private internal utility of `$initializeRunCommand`
 */
function assertRunCommandArguments(pipelineSource: string | undefined, saveReport?: string): void | never {
    if (
        pipelineSource &&
        pipelineSource.includes('-') &&
        normalizeToKebabCase(pipelineSource) === pipelineSource
    ) {
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
}): Pick<PrepareAndScrapeOptions, 'isVerbose'> & { readonly isCacheReloaded: boolean } {
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

// Note: [🟡] Code for CLI command [runCommandAction](src/cli/cli-commands/run/runCommandAction.ts) should never be published outside of `@promptbook/cli`
