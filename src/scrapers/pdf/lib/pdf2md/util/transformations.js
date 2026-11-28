/**
 * Constant for calculate global stats.
 */
const CalculateGlobalStats = require('../models/transformations/text-item/CalculateGlobalStats');

/**
 * Constant for compact lines.
 */
const CompactLines = require('../models/transformations/line-item/CompactLines');
/**
 * Constant for remove repetitive elements.
 */
const RemoveRepetitiveElements = require('../models/transformations/line-item/RemoveRepetitiveElements');
/**
 * Constant for vertical to horizontal.
 */
const VerticalToHorizontal = require('../models/transformations/line-item/VerticalToHorizontal');
/**
 * Constant for detect toc.
 */
const DetectTOC = require('../models/transformations/line-item/DetectTOC');
/**
 * Constant for detect list items.
 */
const DetectListItems = require('../models/transformations/line-item/DetectListItems');
/**
 * Constant for detect headers.
 */
const DetectHeaders = require('../models/transformations/line-item/DetectHeaders');

/**
 * Constant for gather blocks.
 */
const GatherBlocks = require('../models/transformations/line-item-block/GatherBlocks');
/**
 * Constant for detect code quote blocks.
 */
const DetectCodeQuoteBlocks = require('../models/transformations/line-item-block/DetectCodeQuoteBlocks');
/**
 * Constant for detect list levels.
 */
const DetectListLevels = require('../models/transformations/line-item-block/DetectListLevels');
/**
 * Constant for to text blocks.
 */
const ToTextBlocks = require('../models/transformations/ToTextBlocks');
/**
 * Constant for to markdown.
 */
const ToMarkdown = require('../models/transformations/ToMarkdown');

/**
 * Constant for parse result.
 */
const ParseResult = require('../models/ParseResult');

exports.makeTransformations = (fontMap) => [
    new CalculateGlobalStats(fontMap),
    new CompactLines(),
    new RemoveRepetitiveElements(),
    new VerticalToHorizontal(),
    new DetectTOC(),
    new DetectHeaders(),
    new DetectListItems(),

    new GatherBlocks(),
    new DetectCodeQuoteBlocks(),
    new DetectListLevels(),

    new ToTextBlocks(),
    new ToMarkdown(),
];

exports.transform = (pages, transformations) => {
    var parseResult = new ParseResult({ pages });
    let lastTransformation;
    transformations.forEach((transformation) => {
        if (lastTransformation) {
            parseResult = lastTransformation.completeTransform(parseResult);
        }
        parseResult = transformation.transform(parseResult);
        lastTransformation = transformation;
    });
    return parseResult;
};
