import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import spaceTrim from 'spacetrim';
import { startRemoteServer } from '../../remote-server/startRemoteServer';
import { number_port } from '../../types/typeAliases';

/**
 * Initializes `start-server` command for Promptbook CLI utilities
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeStartServerCommand(program: Program) {
    const startServerCommand = program.command('start-server');
    startServerCommand.option('--port <port>', `Port to start the server on`, 4460);

    startServerCommand.description(
        spaceTrim(`
            @@@
        `),
    );

    startServerCommand.action(async ({ port }: { port: number_port }) => {
        startRemoteServer({
            path: '/promptbook',
            port,
            isAnonymousModeAllowed: true,
            isApplicationModeAllowed: true,
            // <- TODO: !!!!!!
        });

        console.error(colors.green(`Server started on port ${port}`));
    });
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 */
