import type { number_integer, number_positive } from '../../types/number_positive';
import type { string_name } from '../../types/string_name';
import { titleToName } from '../../utils/normalization/titleToName';
import type { MarkdownSection } from '../../utils/markdown/parseMarkdownSection';

/**
 * Resolves a unique task name for one parsed markdown section title.
 *
 * @private internal type of `parsePipeline`
 */
export type UniqueSectionNameResolver = (title: string) => string_name;

/**
 * Creates stable unique task names for duplicate section titles.
 *
 * @private internal utility of `parsePipeline`
 */
export function createUniqueSectionNameResolver(
    pipelineSections: ReadonlyArray<MarkdownSection>,
): UniqueSectionNameResolver {
    const sectionCounts: Record<
        string_name,
        { count: number_integer & number_positive; currentIndex: number_integer & number_positive }
    > = {};

    for (const pipelineSection of pipelineSections) {
        const sectionName = titleToName(pipelineSection.title);

        if (sectionCounts[sectionName] === undefined) {
            sectionCounts[sectionName] = { count: 0, currentIndex: 0 };
        }

        sectionCounts[sectionName]!.count++;
    }

    return (title: string): string_name => {
        const sectionName = titleToName(title);
        const sectionCount = sectionCounts[sectionName]!;

        if (sectionCount.count === 1) {
            return sectionName;
        }

        const nameWithSuffix = `${sectionName}-${sectionCount.currentIndex}` as string_name;
        sectionCount.currentIndex++;

        return nameWithSuffix;
    };
}
