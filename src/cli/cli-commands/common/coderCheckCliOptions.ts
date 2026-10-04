import { Command, Option } from 'commander';
import { spaceTrim } from 'spacetrim';
import { CHECK_BEFORE_MODE_VALUES } from '../../../../scripts/run-codex-prompts/checks/CheckBeforeMode';
import { quoteBashArgument } from '../../../../scripts/run-codex-prompts/common/runGoScript/quoteBashArgument';
import { NotAllowed } from '../../../errors/NotAllowed';

/** Standalone shell composition tokens remain operators when a command is supplied as several arguments. */
const SHELL_COMPOSITION_TOKENS = new Set([
    '&&',
    '||',
    '|',
    '|&',
    '&',
    ';',
    '(',
    ')',
    '>',
    '>>',
    '<',
    '2>',
    '2>>',
    '2>&1',
]);

/**
 * Retired aggregate option spellings and their canonical replacements, used only for migration diagnostics.
 * @private shared CLI migration definitions for Coder execution
 */
export const LEGACY_CODER_CHECK_OPTIONS = [
    ['--test', '--check'],
    ['--test-before', '--check-before'],
] as const;

/**
 * Registers the shared project check command and rejects retired aggregate-test spellings.
 * @private shared CLI registration for Coder execution
 */
export function addCoderCheckOptions(command: Command, isCheckBeforeSupported: boolean): void {
    command.option(
        '--check <check-command...>',
        'Run project checks after each prompt; quote the full command when it contains flags or shell composition',
    );
    if (isCheckBeforeSupported) {
        command.addOption(
            new Option(
                '--check-before <mode>',
                `Check before coding: ${CHECK_BEFORE_MODE_VALUES.join(
                    ', ',
                )} (defaults to no; uses npm run check when --check is omitted)`,
            )
                .choices([...CHECK_BEFORE_MODE_VALUES])
                .default('no'),
        );
    }

    // These diagnostic-only options never forward a value or start execution.
    for (const [legacyFlag, replacementFlag] of LEGACY_CODER_CHECK_OPTIONS) {
        command.addOption(new Option(`${legacyFlag} [value...]`).hideHelp());
        command.on(`option:${legacyFlag.slice(2)}`, () => {
            command.error(formatLegacyCoderCheckOptionError(legacyFlag, replacementFlag));
        });
    }
}

/**
 * Builds the same actionable migration diagnostic for registered and direct-script entrypoints.
 * @private shared CLI diagnostic for Coder execution
 */
export function formatLegacyCoderCheckOptionError(legacyFlag: string, replacementFlag: string): string {
    return `Aggregate verification option \`${legacyFlag}\` was renamed to \`${replacementFlag}\`. Update your command and package.json scripts.`;
}

/**
 * Normalizes shell command tokens without parsing a quoted command again or losing spaced argument boundaries.
 * @private shared command normalization for Coder execution
 */
export function normalizeCheckCommandOption(value: string | ReadonlyArray<string> | undefined): string | undefined {
    if (value === undefined) return undefined;
    const parts = typeof value === 'string' ? [value] : value;
    const firstPart = parts[0]?.trim() ?? '';
    for (const [legacyFlag, replacementFlag] of LEGACY_CODER_CHECK_OPTIONS) {
        if (firstPart === legacyFlag || firstPart.startsWith(`${legacyFlag}=`)) {
            throw new NotAllowed(formatLegacyCoderCheckOptionError(legacyFlag, replacementFlag));
        }
    }
    const command =
        parts.length === 1
            ? parts[0]!.trim()
            : parts
                  .map((part) =>
                      !SHELL_COMPOSITION_TOKENS.has(part) && (!part || /[\s'"\\$`;&|<>()*?]/u.test(part))
                          ? quoteBashArgument(part)
                          : part,
                  )
                  .join(' ')
                  .trim();
    if (!command || !firstPart || firstPart.startsWith('-')) {
        throw new NotAllowed(
            spaceTrim(`
            Option \`--check\` requires a non-empty shell command, for example \`--check "npm run check"\`.
        `),
        );
    }
    return command;
}

// Note: [💞] Ignore a discrepancy between file name and exported helper names
