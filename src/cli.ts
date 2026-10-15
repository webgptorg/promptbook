import { EXIT, PtbkError } from './common/errors.js';
import { ENGINE_VERSION } from './common/version.js';
import { createCommandContext } from './cli/context.js';
import { renderCommandHelp, renderTopLevelHelp } from './cli/help.js';
import { parseInvocation } from './cli/parser.js';
import { COMMANDS } from './cli/registry.js';
import { renderError } from './ui/error-view.js';
import { createTerminalProfile } from './ui/terminal.js';

/**
 * Entry point of the `ptbk` command (called by `bin/ptbk.js`).
 *
 * Help and version are resolved before any operation-specific input, project check or service startup.
 *
 * @private CLI entry point
 */
export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
    const raw = argv.includes('--raw') || argv.includes('--no-ui');
    try {
        const invocation = parseInvocation(argv, COMMANDS);
        if (invocation.kind === 'version') {
            process.stdout.write(`${ENGINE_VERSION}\n`);
            return;
        }
        if (invocation.kind === 'help') {
            const terminal = createTerminalProfile({ raw: invocation.raw, nonInteractive: true });
            process.stdout.write(invocation.path.length ? renderCommandHelp(COMMANDS, invocation.path, terminal) : renderTopLevelHelp(COMMANDS, terminal));
            return;
        }
        const context = createCommandContext({ path: invocation.path, spec: invocation.spec, options: invocation.options, explicit: invocation.explicit, positionals: invocation.positionals, argv });
        if (!invocation.spec.run) {
            process.stdout.write(renderCommandHelp(COMMANDS, invocation.path, context.terminal));
            return;
        }
        process.exitCode = await invocation.spec.run(context);
    } catch (error) {
        const terminal = createTerminalProfile({ raw, nonInteractive: true, stdout: process.stderr });
        process.stderr.write(renderError(error, terminal));
        process.exitCode = error instanceof PtbkError ? error.exitCode : EXIT.failure;
    }
}
