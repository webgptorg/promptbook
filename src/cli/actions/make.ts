import type { Command } from 'commander';
import spaceTrim from 'spacetrim';

/**
 * Initializes `make` command for Promptbook CLI utilities
 *
 * @private part of `promptbookCli`
 */
export function initializeMake(program: Command) {
    const helloCommand = program.command('make <path>');
    helloCommand.description(
        spaceTrim(`
            Makes a new promptbook library in given folder
      `),
    );

    helloCommand.argument('<path>', 'Path to promptbook folder');
    helloCommand.option('-f, --format <format>', `Output format of builded library "js", "ts" or "json"`, 'js');
    helloCommand.option('-v, --validate', `Validate logic of promptbook`, true);

    // TODO: !!! Auto-detect AI api keys + explicit api keys as argv

    helloCommand.action(async (path, { format, validate }) => {
        console.info({ path, format, validate });

        // TODO: !!! Implement
        // TODO: !!! Validate logic

        process.exit(0);
    });
}
