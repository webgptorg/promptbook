import { basename } from 'path';
import { spaceTrim } from 'spacetrim';
import type { RefactorCandidate } from './RefactorCandidate';

/**
 * Count values extracted from the candidate reasons for prompt wording.
 *
 * @private type of buildPromptContent
 */
type RefactorCandidateReasonCounts = {
    /**
     * Reported line count when present.
     */
    readonly lineCount: number | null;

    /**
     * Maximum allowed line count when present.
     */
    readonly maxLines: number | null;

    /**
     * Reported entity count when present.
     */
    readonly entityCount: number | null;

    /**
     * Maximum allowed entity count when present.
     */
    readonly maxEntities: number | null;
};

/**
 * Builds prompt content for a refactor candidate.
 *
 * @private function of findRefactorCandidates
 */
export function buildPromptContent(candidate: RefactorCandidate, emojiTag: string): string {
    const fileName = basename(candidate.relativePath);
    const guidanceLines = buildPromptGuidance(candidate);

    return spaceTrim(
        (block) => `

            [ ]

            ${emojiTag} Refactor [\`${fileName}\` file](${candidate.relativePath})

            ${block(guidanceLines.join('\n'))}
        `,
    );
}

/**
 * Builds the refactor guidance section for a prompt.
 *
 * @private function of buildPromptContent
 */
function buildPromptGuidance(candidate: RefactorCandidate): ReadonlyArray<string> {
    const guidance: string[] = [
        /* '- @@@' <- TODO: Should be this here? */
    ];
    const counts = extractReasonCounts(candidate.reasons);
    const densityNote = buildDensityNote(counts);

    if (densityNote) {
        guidance.push(`- ${densityNote}`);
    }

    if (counts.lineCount !== null && counts.maxLines !== null) {
        guidance.push(
            `- The file contains excessive lines of code (${counts.lineCount} lines)`,
            `    - Keep in mind the Single Responsibility Principle (SRP)`,
            `    - Consider breaking it down into smaller, focused modules or components.`,
        );
    }

    if (counts.entityCount !== null && counts.maxEntities !== null) {
        guidance.push(
            `- The file defines too many responsibilities (${counts.entityCount} in single file)`,
            `    - Keep in mind the Single Responsibility Principle (SRP)`,
            `    - Consider breaking it down into smaller, focused modules or components.`,
        );
    }

    guidance.push(
        '- Purpose of this refactoring is to improve code maintainability and readability.',
        '- Look at the internal structure, the usage and also surrounding code to understand how to best refactor this file.',
        '- Consider breaking down large functions into smaller, more manageable ones, removing any redundant code, and ensuring that the file adheres to the project coding standards.',
        '- After the refactoring, ensure that (1) `npm run test-name-discrepancies` and (2) `npm run test-package-generation` are passing successfully.',
        '    1. All the things you have moved to new files should correspond the thing in the file with the file name, for example `MyComponent.tsx` should export `MyComponent`.',
        '    2. All the things you have moved to new files but are private things to the outside world should have `@private function of TheMainThing` JSDoc comment.',
        '- Keep in mind DRY *(Do not repeat yourself)* and SOLID principles while refactoring.',
        '- **Do not change the external behavior** of the code. Focus solely on improving the internal structure and organization of the code.',
        '- Before you start refactoring, make sure to read the code carefully and understand its current structure and functionality. Do a analysis of the current functionality before you start.',
        // <- TODO: !!!!!!!!!! Is this prompt working as expected?
    );

    return guidance;
}

/**
 * Extracts line and entity counts from refactor reasons.
 *
 * @private function of buildPromptContent
 */
function extractReasonCounts(reasons: ReadonlyArray<string>): RefactorCandidateReasonCounts {
    let lineCount: number | null = null;
    let maxLines: number | null = null;
    let entityCount: number | null = null;
    let maxEntities: number | null = null;

    for (const reason of reasons) {
        const lineMatch = reason.match(/lines\s+(?<count>\d+)\/(?<max>\d+)/i);
        if (lineMatch?.groups) {
            lineCount = Number(lineMatch.groups.count);
            maxLines = Number(lineMatch.groups.max);
            continue;
        }

        const entityMatch = reason.match(/entities\s+(?<count>\d+)\/(?<max>\d+)/i);
        if (entityMatch?.groups) {
            entityCount = Number(entityMatch.groups.count);
            maxEntities = Number(entityMatch.groups.max);
        }
    }

    return {
        lineCount,
        maxLines,
        entityCount,
        maxEntities,
    };
}

/**
 * Builds a summary note about file density based on counts.
 *
 * @private function of buildPromptContent
 */
function buildDensityNote(counts: RefactorCandidateReasonCounts): string | null {
    if (counts.lineCount !== null && counts.entityCount !== null) {
        return 'The file mixes multiple concerns, making it harder to follow.';
    }

    if (counts.lineCount !== null) {
        return 'The file is large enough that it is hard to follow.';
    }

    if (counts.entityCount !== null) {
        return 'The file is dense enough that it is hard to follow.';
    }

    return null;
}

/** Note: [🟡] Code for repository script [buildPromptContent](scripts/find-refactor-candidates/buildPromptContent.ts) should never be published outside of `@promptbook/cli` */
