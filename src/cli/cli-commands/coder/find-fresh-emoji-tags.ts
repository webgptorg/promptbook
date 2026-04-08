import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import spaceTrim from 'spacetrim';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { handleActionErrors } from '../common/handleActionErrors';

/**
 * Initializes `coder find-fresh-emoji-tags` command for Promptbook CLI utilities
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeCoderFindFreshEmojiTagCommand(program: Program): $side_effect {
    const command = program.command('find-fresh-emoji-tags');
    command.description(
        spaceTrim(`
            Find unused emoji tags in the codebase

            Scans entire codebase for emoji tags already in use (format: [emoji])
            and identifies fresh (unused) emoji tags from the single-pictogram
            emoji set. Displays 10 random fresh emojis for quick reference.
        `),
    );

    command.action(
        handleActionErrors(async () => {
            // Note: Import the function dynamically to avoid loading heavy dependencies until needed
            const { findFreshEmojiTag } = await import(
                '../../../../scripts/find-fresh-emoji-tags/find-fresh-emoji-tags'
            );

            try {
                await findFreshEmojiTag();
            } catch (error) {
                console.error(colors.bgRed('Failed to find fresh emoji tags:'), error);
                return process.exit(1);
            }

            return process.exit(0);
        }),
    );
}

/** Note: [🟡] Code for CLI command [find-fresh-emoji-tags](src/cli/cli-commands/coder/find-fresh-emoji-tags.ts) should never be published outside of `@promptbook/cli` */
/** Note: [💞] Ignore a discrepancy between file name and entity name */
