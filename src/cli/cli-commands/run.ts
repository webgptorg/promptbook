import { Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */ } from 'commander';
import { spaceTrim } from 'spacetrim';
import type { $side_effect } from '../../utils/organization/$side_effect';
import { handleActionErrors } from './common/handleActionErrors';
import { runCommandAction } from './run/runCommandAction';
import type { RunCommandCliOptions } from './run/runCommandAction';

/**
 * Initializes `run` command for Promptbook CLI utilities
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeRunCommand(program: Program): $side_effect {
    const runCommand = program.command('run', { isDefault: true });

    configureRunCommand(runCommand);
    runCommand.action(
        handleActionErrors((pipelineSource, cliOptions) =>
            runCommandAction(pipelineSource, cliOptions as RunCommandCliOptions),
        ),
    );
}

/**
 * Applies the static description, aliases, arguments, and options for `ptbk run`.
 *
 * @private internal utility of `$initializeRunCommand`
 */
function configureRunCommand(runCommand: Program): void {
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
}

// Note: [🟡] Code for CLI command [run](src/cli/cli-commands/run.ts) should never be published outside of `@promptbook/cli`
// TODO: !!5 Catch and wrap all errors from CLI
// TODO: [🧠] Pass `maxExecutionAttempts`, `csvSettings`
// TODO: [🥃][main] !!3 Allow `ptbk run` without configuring any llm tools
// Note: [💞] Ignore a discrepancy between file name and entity name
// TODO: [🖇] What about symlinks? Maybe flag --follow-symlinks
