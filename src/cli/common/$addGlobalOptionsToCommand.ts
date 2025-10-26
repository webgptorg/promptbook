import { Command } from 'commander';
import { DEFAULT_REMOTE_SERVER_URL } from '../../config';
import { $side_effect } from '../../utils/organization/$side_effect';

/**
 * Note: `$` is used to indicate that this function is not a pure function - it registers an option in the CLI
 *
 * @private utility of CLI
 */
export function $addGlobalOptionsToCommand(command: Command): $side_effect {
    command.option('-v, --verbose', `Log more details`, false);
    command.option(
        '--no-interactive',
        `Input is not interactive, if true, no CLI input is prompted if required, so either defaults are used or the command fails with exit code 1`,
    );
    command.option(
        '-p, --provider <provider>',
        `Which LLM provider to use: "BYOK" / "BRING_YOUR_OWN_KEYS" or "REMOTE_SERVER" / "RS"`,
        'REMOTE_SERVER',
    );
    command.option('--remote-server-url <url>', `URL of remote server to use when `, DEFAULT_REMOTE_SERVER_URL);
}
