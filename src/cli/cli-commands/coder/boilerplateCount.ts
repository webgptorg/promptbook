import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../errors/NotAllowed';

/**
 * Separator between the number of generated files and the number of prompts in each of them,
 * for example `10*7`.
 *
 * @private internal utility of `ptbk coder`
 */
const BOILERPLATE_COUNT_SEPARATOR = '*';

/**
 * Pattern of the `--count` option value, either `N` or `N*M`.
 */
const BOILERPLATE_COUNT_PATTERN = /^(?<filesCount>\d+)(?:\s*\*\s*(?<promptsPerFileCount>\d+))?$/u;

/**
 * How many prompt boilerplate files are generated and how many prompts each of them contains.
 *
 * @private internal utility of `ptbk coder`
 */
export type BoilerplateCount = {
    /**
     * Number of generated prompt boilerplate files.
     */
    readonly filesCount: number;

    /**
     * Number of prompts written into each generated file.
     *
     * Note: More than one prompt per file is an advanced option - each prompt is one separate
     *       coding task separated by `---` and tagged with its own fresh emoji tag.
     */
    readonly promptsPerFileCount: number;
};

/**
 * Number of prompt boilerplate files and prompts per file used when `--count` is not provided.
 *
 * @private internal utility of `ptbk coder`
 */
export const DEFAULT_BOILERPLATE_COUNT: BoilerplateCount = {
    filesCount: 5,
    promptsPerFileCount: 1,
};

/**
 * Formats one boilerplate count back into the `N*M` notation of the `--count` option.
 *
 * @private internal utility of `ptbk coder`
 */
export function formatBoilerplateCount({ filesCount, promptsPerFileCount }: BoilerplateCount): string {
    return `${filesCount}${BOILERPLATE_COUNT_SEPARATOR}${promptsPerFileCount}`;
}

/**
 * Default value of the `--count` option rendered in the `N*M` notation, for example `5*1`.
 *
 * @private internal utility of `ptbk coder`
 */
export const DEFAULT_BOILERPLATE_COUNT_OPTION_VALUE = formatBoilerplateCount(DEFAULT_BOILERPLATE_COUNT);

/**
 * Description of the `--count` option shared by all commands which generate prompt boilerplates.
 *
 * @private internal utility of `ptbk coder`
 */
export const BOILERPLATE_COUNT_OPTION_DESCRIPTION = spaceTrim(`
    Number of generated prompt boilerplate files, optionally with the number of prompts in each of them.

    Use \`N\` (or \`N*1\`) for N files with one prompt each,
    or the advanced \`N*M\` notation for N files with M prompts each, for example \`10*7\`.
`);

/**
 * Parses the `--count` option value into the number of files and the number of prompts in each of them.
 *
 * Both notations are supported:
 * - `N` and `N*1` => N files with one prompt each
 * - `N*M` => N files with M prompts each
 *
 * @private internal utility of `ptbk coder`
 */
export function parseBoilerplateCount(countOption: string): BoilerplateCount {
    const normalizedCountOption = countOption.trim();
    const match = BOILERPLATE_COUNT_PATTERN.exec(normalizedCountOption);

    if (match === null) {
        throw new NotAllowed(
            spaceTrim(`
                Invalid value for \`--count\`: \`${countOption}\`.

                Use either \`N\` for N files with one prompt each,
                or the advanced \`N*M\` notation for N files with M prompts each:

                - \`--count 5\`
                - \`--count 5*1\`
                - \`--count 10*7\`
            `),
        );
    }

    const filesCount = Number(match.groups?.filesCount);
    const promptsPerFileCount =
        match.groups?.promptsPerFileCount === undefined
            ? DEFAULT_BOILERPLATE_COUNT.promptsPerFileCount
            : Number(match.groups.promptsPerFileCount);

    assertsPositiveBoilerplateCountPart(filesCount, countOption, 'number of generated files');
    assertsPositiveBoilerplateCountPart(promptsPerFileCount, countOption, 'number of prompts in each file');

    return { filesCount, promptsPerFileCount };
}

/**
 * Asserts that one part of the `--count` option value is a positive integer.
 *
 * @private internal utility of `parseBoilerplateCount`
 */
function assertsPositiveBoilerplateCountPart(
    countPart: number,
    countOption: string,
    countPartDescription: string,
): void {
    if (Number.isInteger(countPart) && countPart > 0) {
        return;
    }

    throw new NotAllowed(
        spaceTrim(`
            Invalid value for \`--count\`: \`${countOption}\`.

            The ${countPartDescription} must be **a positive integer**, for example \`--count 10*7\`.
        `),
    );
}

// Note: [🟡] Code for coder boilerplate count [boilerplateCount](src/cli/cli-commands/coder/boilerplateCount.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and exported helper names
