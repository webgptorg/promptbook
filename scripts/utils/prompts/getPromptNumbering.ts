import glob from 'glob-promise';
import { basename } from 'path';

/**
 * Configuration for calculating the next prompt numbering sequence.
 */
export type PromptNumberingOptions = {
    /**
     * Absolute or relative path to the prompts directory.
     */
    readonly promptsDir: string;
    /**
     * Date used to build the YYYY-MM prefix (defaults to now).
     */
    readonly date?: Date;
    /**
     * Step size used between sequential prompt numbers (defaults to 10).
     */
    readonly step?: number;
    /**
     * Glob patterns to ignore when scanning prompt files.
     */
    readonly ignoreGlobs?: ReadonlyArray<string>;
};

/**
 * Resolved prompt numbering information for the current month.
 */
export type PromptNumbering = {
    /**
     * Date prefix in YYYY-MM format.
     */
    readonly datePrefix: string;
    /**
     * First available prompt number for the month.
     */
    readonly startNumber: number;
    /**
     * Step size between prompt numbers.
     */
    readonly step: number;
};

/**
 * Calculates the next available prompt numbering sequence for a month.
 */
export async function getPromptNumbering(options: PromptNumberingOptions): Promise<PromptNumbering> {
    const now = options.date ?? new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const datePrefix = `${year}-${month}`;

    const step = options.step ?? 10;

    const promptFiles = await glob('**/*.md', {
        cwd: options.promptsDir,
        ignore: options.ignoreGlobs,
        nodir: true,
    });

    const numberPattern = new RegExp(`${datePrefix}-(\\d{4})-`);
    let highestNumber = -step;

    for (const file of promptFiles) {
        const match = basename(file).match(numberPattern);
        if (!match?.[1]) {
            continue;
        }
        const number = parseInt(match[1], 10);
        if (!Number.isNaN(number) && number > highestNumber) {
            highestNumber = number;
        }
    }

    const startNumber = highestNumber < 0 ? 0 : highestNumber + step;

    return {
        datePrefix,
        startNumber,
        step,
    };
}

/**
 * Formats a numeric prompt identifier as a 4-digit string.
 */
export function formatPromptNumber(value: number): string {
    return Math.max(0, value).toString().padStart(4, '0');
}

/**
 * Builds a prompt filename using the date prefix, number, and slug.
 */
export function buildPromptFilename(datePrefix: string, number: number, slug: string): string {
    return `${datePrefix}-${formatPromptNumber(number)}-${slug}.md`;
}

/**
 * Note: [?] Code in this file should never be published in any package
 */
