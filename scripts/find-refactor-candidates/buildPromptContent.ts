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

    /**
     * Reported function count when present.
     */
    readonly functionCount: number | null;

    /**
     * Maximum allowed function count when present.
     */
    readonly maxFunctions: number | null;

    /**
     * Highest function complexity when present.
     */
    readonly functionComplexity: number | null;

    /**
     * Maximum allowed function complexity when present.
     */
    readonly maxFunctionComplexity: number | null;

    /**
     * Name of the most complex function when present.
     */
    readonly mostComplexFunctionName: string | null;
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

    if (counts.functionCount !== null && counts.maxFunctions !== null) {
        guidance.push(
            `- The file contains too many functions (${counts.functionCount}/${counts.maxFunctions})`,
            `    - Keep related responsibilities grouped behind small facades or focused modules.`,
            `    - Consider extracting private helpers or splitting independent concerns into dedicated files.`,
        );
    }

    if (counts.functionComplexity !== null && counts.maxFunctionComplexity !== null) {
        const functionSuffix = counts.mostComplexFunctionName ? ` in \`${counts.mostComplexFunctionName}\`` : '';

        guidance.push(
            `- The file contains overly complex logic${functionSuffix} (${counts.functionComplexity}/${counts.maxFunctionComplexity})`,
            `    - Break branching logic into smaller, focused helper functions.`,
            `    - Keep each function responsible for one clear step or decision.`,
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
 * Extracts structural counts from refactor reasons.
 *
 * @private function of buildPromptContent
 */
function extractReasonCounts(reasons: ReadonlyArray<string>): RefactorCandidateReasonCounts {
    let lineCount: number | null = null;
    let maxLines: number | null = null;
    let entityCount: number | null = null;
    let maxEntities: number | null = null;
    let functionCount: number | null = null;
    let maxFunctions: number | null = null;
    let functionComplexity: number | null = null;
    let maxFunctionComplexity: number | null = null;
    let mostComplexFunctionName: string | null = null;

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
            continue;
        }

        const functionMatch = reason.match(/functions\s+(?<count>\d+)\/(?<max>\d+)/i);
        if (functionMatch?.groups) {
            functionCount = Number(functionMatch.groups.count);
            maxFunctions = Number(functionMatch.groups.max);
            continue;
        }

        const complexityMatch = reason.match(
            /complexity\s+(?<count>\d+)\/(?<max>\d+)(?:\s+in\s+`(?<functionName>[^`]+)`)?/i,
        );
        if (complexityMatch?.groups) {
            functionComplexity = Number(complexityMatch.groups.count);
            maxFunctionComplexity = Number(complexityMatch.groups.max);
            mostComplexFunctionName = complexityMatch.groups.functionName || null;
        }
    }

    return {
        lineCount,
        maxLines,
        entityCount,
        maxEntities,
        functionCount,
        maxFunctions,
        functionComplexity,
        maxFunctionComplexity,
        mostComplexFunctionName,
    };
}

/**
 * Builds a summary note about file density based on counts.
 *
 * @private function of buildPromptContent
 */
function buildDensityNote(counts: RefactorCandidateReasonCounts): string | null {
    const activeSignalsCount = [
        counts.lineCount !== null,
        counts.entityCount !== null,
        counts.functionCount !== null,
        counts.functionComplexity !== null,
    ].filter(Boolean).length;

    if (activeSignalsCount > 1) {
        return 'The file mixes multiple concerns and dense logic, making it harder to follow.';
    }

    if (counts.lineCount !== null) {
        return 'The file is large enough that it is hard to follow.';
    }

    if (counts.entityCount !== null || counts.functionCount !== null) {
        return 'The file packs too many responsibilities into one place.';
    }

    if (counts.functionComplexity !== null) {
        return 'The file contains logic that is too complex to follow comfortably.';
    }

    return null;
}

// Note: [🟡] Code for repository script [buildPromptContent](scripts/find-refactor-candidates/buildPromptContent.ts) should never be published outside of `@promptbook/cli`
