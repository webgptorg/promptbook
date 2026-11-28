/**
 * Pattern matching a markdown section heading (`## Title`) that separates system-message sections
 *
 * @private internal constant of `deduplicateSystemMessage`
 */
const SYSTEM_MESSAGE_SECTION_HEADING_PATTERN = /^##(?!#)\s*(.+?)\s*$/;

/**
 * Pattern matching a fenced code block delimiter which suspends section and block splitting
 *
 * @private internal constant of `deduplicateSystemMessage`
 */
const CODE_FENCE_PATTERN = /^\s*(?:```|~~~)/;

/**
 * Pattern matching a markdown list item which keeps merged bullet lists visually compact
 *
 * @private internal constant of `deduplicateSystemMessage`
 */
const LIST_ITEM_PATTERN = /^\s*(?:[-*+]|\d+[.)])\s/;

/**
 * One block of a system-message region, which is a group of lines surrounded by blank lines
 *
 * @private internal type of `deduplicateSystemMessage`
 */
type SystemMessageBlock = {
    /**
     * Exact text of the block
     */
    readonly text: string;

    /**
     * Whether the block opens a section occurrence merged into an earlier section with the same heading
     */
    readonly isOpeningMergedSection: boolean;
};

/**
 * One region of the system message, which is either the intro before the first heading or one `## Title` section
 *
 * @private internal type of `deduplicateSystemMessage`
 */
type SystemMessageRegion = {
    /**
     * Case-insensitive key used to merge regions sharing one heading, `null` for the intro before the first heading
     */
    readonly titleKey: string | null;

    /**
     * Original heading line kept so the rendered heading preserves its exact original text
     */
    readonly headingLine: string | null;

    /**
     * Whether the original region separated its heading from the body by a blank line
     */
    readonly isBodySeparatedByBlankLine: boolean;

    /**
     * Body blocks of the region in their original order
     */
    readonly blocks: ReadonlyArray<SystemMessageBlock>;
};

/**
 * Removes duplicated instructions from a generated system message
 *
 * Commitments are applied one by one, so a commitment used multiple times in one book repeats its whole
 * section, including the shared guidance preamble. For example two `WRITING RULES` commitments emit the
 * `## Writing rules` heading and its guidance paragraph twice. This function merges all sections sharing
 * one heading into the position of their first occurrence and keeps every identical block only once.
 *
 * @param systemMessage The assembled system message which may contain repeated sections and blocks
 * @returns The system message where each section heading and each identical block appears exactly once
 *
 * @private internal utility of `createAgentModelRequirementsWithCommitments`
 */
export function deduplicateSystemMessage(systemMessage: string): string {
    if (!systemMessage.trim()) {
        return systemMessage;
    }

    return splitSystemMessageIntoRegions(systemMessage)
        .reduce(mergeRegionSharingHeading, [])
        .map(removeDuplicateBlocksFromRegion)
        .map(renderRegion)
        .filter((renderedRegion) => renderedRegion !== '')
        .join('\n\n');
}

/**
 * Splits the system message into the intro region and one region per `## Title` section
 *
 * @param systemMessage The system message to split
 * @returns Regions in their original order, without empty ones
 *
 * @private internal utility of `deduplicateSystemMessage`
 */
function splitSystemMessageIntoRegions(systemMessage: string): ReadonlyArray<SystemMessageRegion> {
    const regions: SystemMessageRegion[] = [];
    let headingLine: string | null = null;
    let bodyLines: string[] = [];
    let isInsideCodeFence = false;

    for (const line of systemMessage.split(/\r?\n/)) {
        if (CODE_FENCE_PATTERN.test(line)) {
            isInsideCodeFence = !isInsideCodeFence;
        }

        if (isInsideCodeFence || !SYSTEM_MESSAGE_SECTION_HEADING_PATTERN.test(line)) {
            bodyLines.push(line);
            continue;
        }

        regions.push(createRegion(headingLine, bodyLines));
        headingLine = line;
        bodyLines = [];
    }

    regions.push(createRegion(headingLine, bodyLines));

    return regions.filter((region) => region.headingLine !== null || region.blocks.length > 0);
}

/**
 * Creates one region from its heading line and its raw body lines
 *
 * @param headingLine The original `## Title` line, or `null` for the intro before the first heading
 * @param bodyLines The raw lines following the heading line
 * @returns The region with its body already split into blocks
 *
 * @private internal utility of `splitSystemMessageIntoRegions`
 */
function createRegion(headingLine: string | null, bodyLines: ReadonlyArray<string>): SystemMessageRegion {
    return {
        titleKey: headingLine === null ? null : normalizeSectionTitle(headingLine),
        headingLine,
        isBodySeparatedByBlankLine: bodyLines[0] !== undefined && bodyLines[0].trim() === '',
        blocks: splitBodyIntoBlocks(bodyLines),
    };
}

/**
 * Normalizes a heading line into a key usable for matching sections which belong together
 *
 * @param headingLine The original `## Title` line
 * @returns Lowercased title without the markdown heading prefix
 *
 * @private internal utility of `createRegion`
 */
function normalizeSectionTitle(headingLine: string): string {
    return (SYSTEM_MESSAGE_SECTION_HEADING_PATTERN.exec(headingLine)?.[1] ?? headingLine).toLowerCase();
}

/**
 * Splits raw body lines into blocks separated by blank lines while keeping fenced code blocks intact
 *
 * @param bodyLines The raw lines of one region body
 * @returns Non-empty blocks in their original order
 *
 * @private internal utility of `createRegion`
 */
function splitBodyIntoBlocks(bodyLines: ReadonlyArray<string>): ReadonlyArray<SystemMessageBlock> {
    const blockTexts: string[] = [];
    let blockLines: string[] = [];
    let isInsideCodeFence = false;

    for (const line of bodyLines) {
        if (CODE_FENCE_PATTERN.test(line)) {
            isInsideCodeFence = !isInsideCodeFence;
        }

        if (!isInsideCodeFence && line.trim() === '') {
            blockTexts.push(blockLines.join('\n'));
            blockLines = [];
            continue;
        }

        blockLines.push(line);
    }

    blockTexts.push(blockLines.join('\n'));

    return blockTexts
        .filter((blockText) => blockText.trim() !== '')
        .map((blockText) => ({ text: blockText, isOpeningMergedSection: false }));
}

/**
 * Appends one region to the already merged regions, merging it into an earlier region with the same heading
 *
 * @param mergedRegions Regions merged so far, used as the reducer accumulator
 * @param region The next region in original order
 * @returns The accumulator with the region either appended or merged into its earlier twin
 *
 * @private internal utility of `deduplicateSystemMessage`
 */
function mergeRegionSharingHeading(
    mergedRegions: ReadonlyArray<SystemMessageRegion>,
    region: SystemMessageRegion,
): ReadonlyArray<SystemMessageRegion> {
    const existingRegionIndex = mergedRegions.findIndex(
        (mergedRegion) => region.titleKey !== null && mergedRegion.titleKey === region.titleKey,
    );

    if (existingRegionIndex === -1) {
        return [...mergedRegions, region];
    }

    return mergedRegions.map((mergedRegion, index) =>
        index !== existingRegionIndex
            ? mergedRegion
            : {
                  ...mergedRegion,
                  blocks: [...mergedRegion.blocks, ...markFirstBlockAsOpeningMergedSection(region.blocks)],
              },
    );
}

/**
 * Marks the first block of a merged section occurrence so the merge seam can be rendered as one list
 *
 * @param blocks The blocks of the section occurrence being merged into an earlier section
 * @returns The same blocks with the first one marked as opening a merged section
 *
 * @private internal utility of `mergeRegionSharingHeading`
 */
function markFirstBlockAsOpeningMergedSection(
    blocks: ReadonlyArray<SystemMessageBlock>,
): ReadonlyArray<SystemMessageBlock> {
    return blocks.map((block, index) => (index === 0 ? { ...block, isOpeningMergedSection: true } : block));
}

/**
 * Keeps only the first occurrence of every identical block inside one region
 *
 * @param region The region whose blocks may repeat
 * @returns The region without repeated blocks
 *
 * @private internal utility of `deduplicateSystemMessage`
 */
function removeDuplicateBlocksFromRegion(region: SystemMessageRegion): SystemMessageRegion {
    const alreadyRenderedTexts = new Set<string>();
    const uniqueBlocks: SystemMessageBlock[] = [];
    let isMergeSeamPending = false;

    for (const block of region.blocks) {
        if (alreadyRenderedTexts.has(block.text)) {
            // Note: A removed block must still hand its merge seam over to the next block which survives
            isMergeSeamPending = isMergeSeamPending || block.isOpeningMergedSection;
            continue;
        }

        alreadyRenderedTexts.add(block.text);
        uniqueBlocks.push({
            text: block.text,
            isOpeningMergedSection: block.isOpeningMergedSection || isMergeSeamPending,
        });
        isMergeSeamPending = false;
    }

    return { ...region, blocks: uniqueBlocks };
}

/**
 * Renders one region back into its markdown representation
 *
 * @param region The region to render
 * @returns The heading line together with its joined blocks
 *
 * @private internal utility of `deduplicateSystemMessage`
 */
function renderRegion(region: SystemMessageRegion): string {
    const body = joinBlocks(region.blocks);

    if (region.headingLine === null) {
        return body;
    }

    if (body === '') {
        return region.headingLine;
    }

    return `${region.headingLine}${region.isBodySeparatedByBlankLine ? '\n\n' : '\n'}${body}`;
}

/**
 * Joins blocks of one region back together
 *
 * @param blocks The blocks to join in their original order
 * @returns The joined body of one region
 *
 * @private internal utility of `renderRegion`
 */
function joinBlocks(blocks: ReadonlyArray<SystemMessageBlock>): string {
    return blocks
        .map((block, index) =>
            index === 0 ? block.text : `${createBlockSeparator(blocks[index - 1]!, block)}${block.text}`,
        )
        .join('');
}

/**
 * Chooses the separator between two neighboring blocks
 *
 * Blocks are normally separated by a blank line, exactly as they were written. Only where two sections were
 * merged together their lists are joined into one compact list instead of two separate ones.
 *
 * @param previousBlock The block rendered before the separator
 * @param nextBlock The block rendered after the separator
 * @returns Either a single or a double newline
 *
 * @private internal utility of `joinBlocks`
 */
function createBlockSeparator(previousBlock: SystemMessageBlock, nextBlock: SystemMessageBlock): string {
    if (!nextBlock.isOpeningMergedSection) {
        return '\n\n';
    }

    const previousBlockLines = previousBlock.text.split('\n');
    const isListContinuing =
        LIST_ITEM_PATTERN.test(previousBlockLines[previousBlockLines.length - 1]!) &&
        LIST_ITEM_PATTERN.test(nextBlock.text.split('\n')[0]!);

    return isListContinuing ? '\n' : '\n\n';
}
