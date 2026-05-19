// @flow

/**
 * Constant for to line item transformation.
 */
const ToLineItemTransformation = require('../ToLineItemTransformation');
/**
 * Constant for parse result.
 */
const ParseResult = require('../../ParseResult');
/**
 * Constant for { detected annotation }.
 */
const { DETECTED_ANNOTATION } = require('../../Annotation');
/**
 * Constant for block type.
 */
const BlockType = require('../../markdown/BlockType');
/**
 * Constant for { headline by level }.
 */
const { headlineByLevel } = require('../../markdown/BlockType');
/**
 * Constant for { is list item }.
 */
const { isListItem } = require('../../../util/string-functions');

/**
 * Detects headlines based on height, font, and spacing signals collected earlier in the pipeline.
 *
 * @private internal PDF-to-Markdown line-item transformation
 */
class DetectHeaders extends ToLineItemTransformation {
    constructor() {
        super('Detect Headers');
    }

    transform(parseResult /*: ParseResult */) /*: ParseResult */ {
        const { tocPages, headlineTypeToHeightRange, mostUsedHeight, mostUsedDistance, mostUsedFont, maxHeight } =
            parseResult.globals;

        const detectedHeaders =
            detectTitlePageHeaders(parseResult.pages, maxHeight, mostUsedHeight) +
            detectRemainingHeaders(
                parseResult.pages,
                tocPages,
                headlineTypeToHeightRange,
                mostUsedHeight,
            ) +
            detectParagraphHeightHeaders(
                parseResult.pages,
                mostUsedHeight,
                mostUsedFont,
                mostUsedDistance,
            );

        return new ParseResult({
            ...parseResult,
            messages: ['Detected ' + detectedHeaders + ' headlines.'],
        });
    }
}

module.exports = DetectHeaders;

/**
 * Detects title-page headlines on pages containing the tallest text in the document.
 *
 * @private helper of DetectHeaders
 */
function detectTitlePageHeaders(pages, maxHeight, mostUsedHeight) {
    var detectedHeaders = 0;
    const pagesWithMaxHeight = findPagesWithMaxHeight(pages, maxHeight);
    const minSecondLevelHeaderHeightOnMaxPage = mostUsedHeight + (maxHeight - mostUsedHeight) / 4;

    pagesWithMaxHeight.forEach((titlePage) => {
        titlePage.items.forEach((item) => {
            if (!isTitlePageHeaderCandidate(item, minSecondLevelHeaderHeightOnMaxPage)) {
                return;
            }

            detectedHeaders += markDetectedHeader(item, item.height === maxHeight ? BlockType.H1 : BlockType.H2);
        });
    });

    return detectedHeaders;
}

/**
 * Detects the remaining headlines using either TOC-derived height ranges or relative text heights.
 *
 * @private helper of DetectHeaders
 */
function detectRemainingHeaders(pages, tocPages, headlineTypeToHeightRange, mostUsedHeight) {
    if (tocPages.length > 0) {
        return detectHeadersUsingTocHeights(pages, headlineTypeToHeightRange, mostUsedHeight);
    }

    return detectHeadersUsingRelativeHeights(pages, mostUsedHeight);
}

/**
 * Detects additional headlines by reusing the exact height ranges discovered from the table of contents.
 *
 * @private helper of DetectHeaders
 */
function detectHeadersUsingTocHeights(pages, headlineTypeToHeightRange, mostUsedHeight) {
    var detectedHeaders = 0;

    Object.keys(headlineTypeToHeightRange).forEach((headlineTypeName) => {
        const range = headlineTypeToHeightRange[headlineTypeName];
        if (range.max <= mostUsedHeight) {
            return;
        }

        pages.forEach((page) => {
            page.items.forEach((item) => {
                if (!item.type && item.height === range.max) {
                    detectedHeaders += markDetectedHeader(item, BlockType.enumValueOf(headlineTypeName));
                }
            });
        });
    });

    return detectedHeaders;
}

/**
 * Detects headlines by assigning the tallest remaining text heights to descending headline levels.
 *
 * @private helper of DetectHeaders
 */
function detectHeadersUsingRelativeHeights(pages, mostUsedHeight) {
    var detectedHeaders = 0;
    const candidateHeights = collectCandidateHeadlineHeights(pages, mostUsedHeight);

    candidateHeights.forEach((height, index) => {
        const headlineLevel = index + 2;
        if (headlineLevel > 6) {
            return;
        }

        const headlineType = headlineByLevel(headlineLevel);
        detectedHeaders += detectHeadersByHeight(pages, height, headlineType);
    });

    return detectedHeaders;
}

/**
 * Collects unique text heights that can still represent headlines when no TOC information is available.
 *
 * @private helper of DetectHeaders
 */
function collectCandidateHeadlineHeights(pages, mostUsedHeight) {
    const heights = [];

    pages.forEach((page) => {
        page.items.forEach((item) => {
            if (isRelativeHeightHeaderCandidate(item, mostUsedHeight) && !heights.includes(item.height)) {
                heights.push(item.height);
            }
        });
    });

    heights.sort((a, b) => b - a);

    return heights;
}

/**
 * Detects all remaining untyped headers that match the provided text height.
 *
 * @private helper of DetectHeaders
 */
function detectHeadersByHeight(pages, height, headlineType) {
    var detectedHeaders = 0;

    pages.forEach((page) => {
        page.items.forEach((item) => {
            if (!item.type && item.height === height && !isListItem(item.text())) {
                detectedHeaders += markDetectedHeader(item, headlineType);
            }
        });
    });

    return detectedHeaders;
}

/**
 * Detects uppercase headlines that still use paragraph height but differ in font and spacing.
 *
 * @private helper of DetectHeaders
 */
function detectParagraphHeightHeaders(pages, mostUsedHeight, mostUsedFont, mostUsedDistance) {
    const deepestDetectedHeadlineLevel = findDeepestDetectedHeadlineLevel(pages);
    if (deepestDetectedHeadlineLevel >= 6) {
        return 0;
    }

    var detectedHeaders = 0;
    const nextHeadlineType = headlineByLevel(deepestDetectedHeadlineLevel + 1);

    pages.forEach((page) => {
        var previousItem;

        page.items.forEach((item) => {
            if (
                isParagraphHeightHeaderCandidate(
                    item,
                    previousItem,
                    mostUsedHeight,
                    mostUsedFont,
                    mostUsedDistance,
                )
            ) {
                detectedHeaders += markDetectedHeader(item, nextHeadlineType);
            }

            previousItem = item;
        });
    });

    return detectedHeaders;
}

/**
 * Finds the deepest headline level that has already been detected in the current parse result.
 *
 * @private helper of DetectHeaders
 */
function findDeepestDetectedHeadlineLevel(pages) {
    var deepestDetectedHeadlineLevel = 1;

    pages.forEach((page) => {
        page.items.forEach((item) => {
            if (item.type && item.type.headline) {
                deepestDetectedHeadlineLevel = Math.max(deepestDetectedHeadlineLevel, item.type.headlineLevel);
            }
        });
    });

    return deepestDetectedHeadlineLevel;
}

/**
 * Marks an item as a detected headline and returns the number of added detections.
 *
 * @private helper of DetectHeaders
 */
function markDetectedHeader(item, headlineType) {
    item.annotation = DETECTED_ANNOTATION;
    item.type = headlineType;

    return 1;
}

/**
 * Checks whether an item qualifies as a title-page header candidate.
 *
 * @private helper of DetectHeaders
 */
function isTitlePageHeaderCandidate(item, minSecondLevelHeaderHeightOnMaxPage) {
    return !item.type && item.height > minSecondLevelHeaderHeightOnMaxPage;
}

/**
 * Checks whether an item qualifies as a non-TOC headline candidate based on its relative text height.
 *
 * @private helper of DetectHeaders
 */
function isRelativeHeightHeaderCandidate(item, mostUsedHeight) {
    return !item.type && item.height > mostUsedHeight && !isListItem(item.text());
}

/**
 * Checks whether an item qualifies as a headline despite sharing the normal paragraph height.
 *
 * @private helper of DetectHeaders
 */
function isParagraphHeightHeaderCandidate(item, previousItem, mostUsedHeight, mostUsedFont, mostUsedDistance) {
    return (
        !item.type &&
        item.height === mostUsedHeight &&
        item.font !== mostUsedFont &&
        isSeparatedFromPreviousItem(previousItem, item, mostUsedDistance) &&
        item.text() === item.text().toUpperCase()
    );
}

/**
 * Checks whether the current item is visually separated enough from the previous line to act as a header.
 *
 * @private helper of DetectHeaders
 */
function isSeparatedFromPreviousItem(previousItem, item, mostUsedDistance) {
    return (
        !previousItem ||
        previousItem.y < item.y ||
        (previousItem.type && previousItem.type.headline) ||
        previousItem.y - item.y > mostUsedDistance * 2
    );
}

/**
 * Finds pages with max height.
 *
 * @private helper of DetectHeaders
 */
function findPagesWithMaxHeight(pages, maxHeight) {
    const maxHeaderPagesSet = new Set();
    pages.forEach((page) => {
        page.items.forEach((item) => {
            if (!item.type && item.height === maxHeight) {
                maxHeaderPagesSet.add(page);
            }
        });
    });
    return maxHeaderPagesSet;
}
