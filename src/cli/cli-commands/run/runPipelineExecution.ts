import colors from 'colors';
import { writeFile } from 'fs/promises';
import { executionReportJsonToString } from '../../../execution/execution-report/executionReportJsonToString';
import type { PipelineExecutor } from '../../../execution/PipelineExecutor';
import type { PipelineExecutorResult } from '../../../execution/PipelineExecutorResult';
import { usageToHuman } from '../../../execution/utils/usageToHuman';
import type { string_parameter_name, string_parameter_value } from '../../../types/string_name';
import { countLines } from '../../../utils/expectation-counters/countLines';
import { countWords } from '../../../utils/expectation-counters/countWords';

/**
 * Executes the pipeline, persists any requested report, and prints the final CLI output.
 *
 * @private internal utility of `$initializeRunCommand`
 */
export async function runPipelineExecution(options: {
    readonly pipelineExecutor: PipelineExecutor;
    readonly inputParameters: Record<string_parameter_name, string_parameter_value>;
    readonly isVerbose: boolean;
    readonly json?: string;
    readonly saveReport?: string;
}): Promise<void> {
    const { pipelineExecutor, inputParameters, isVerbose, json, saveReport } = options;
    const executionResult = await executeRunPipeline({ pipelineExecutor, inputParameters, isVerbose });

    await saveRunExecutionReport({ executionReport: executionResult.executionReport, saveReport });

    if (saveReport && isVerbose) {
        console.info(colors.green(`Report saved to ${saveReport}`));
    }

    printRunExecutionResult({ executionResult, json, isVerbose });
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

// Note: [🟡] Code for CLI command [runPipelineExecution](src/cli/cli-commands/run/runPipelineExecution.ts) should never be published outside of `@promptbook/cli`
