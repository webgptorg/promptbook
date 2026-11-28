// @flow

/**
 * Constant for to line item block transformation.
 */
const ToLineItemBlockTransformation = require('../ToLineItemBlockTransformation');
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
 * Constant for { min x from blocks }.
 */
const { minXFromBlocks } = require('../../../util/page-item-functions');

// Detect items which are code/quote blocks
module.exports = class DetectCodeQuoteBlocks extends ToLineItemBlockTransformation {
    constructor() {
        super('$1');
    }

    transform(parseResult /*: ParseResult */) /*: ParseResult */ {
        const { mostUsedHeight } = parseResult.globals;
        var foundCodeItems = 0;
        parseResult.pages.forEach((page) => {
            var minX = minXFromBlocks(page.items);
            page.items.forEach((block) => {
                if (!block.type && looksLikeCodeBlock(minX, block.items, mostUsedHeight)) {
                    block.annotation = DETECTED_ANNOTATION;
                    block.type = BlockType.CODE;
                    foundCodeItems++;
                }
            });
        });

        return new ParseResult({
            ...parseResult,
            messages: ['Detected ' + foundCodeItems + ' code/quote items.'],
        });
    }
};

/**
 * Handles looks like code block.
 */
function looksLikeCodeBlock(minX, items, mostUsedHeight) {
    if (items.length === 0) {
        return false;
    }
    if (items.length === 1) {
        return items[0].x > minX && items[0].height <= mostUsedHeight + 1;
    }
    for (var item of items) {
        if (item.x === minX) {
            return false;
        }
    }
    return true;
}
