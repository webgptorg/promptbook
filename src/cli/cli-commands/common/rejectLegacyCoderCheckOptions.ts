import { NotAllowed } from '../../../errors/NotAllowed';
import { spaceTrim } from 'spacetrim';

/**
 * Rejects the removed aggregate-verification option spellings used by older Coder commands.
 *
 * @private internal migration guard for Coder CLI commands
 */
export function rejectLegacyCoderCheckOptions(options: {
    readonly legacyTest?: unknown;
    readonly legacyTestBefore?: unknown;
}): void {
    if (options.legacyTest !== undefined) {
        throw new NotAllowed(
            spaceTrim(`
                The aggregate verification flag \`--test\` was renamed to \`--check\`.

                Use \`--check <check-command...>\` instead.
            `),
        );
    }

    if (options.legacyTestBefore !== undefined) {
        throw new NotAllowed(
            spaceTrim(`
                The pre-coding verification flag \`--test-before\` was renamed to \`--check-before\`.

                Use \`--check-before <no|yes-and-fail|yes-and-fix>\` instead.
            `),
        );
    }
}
