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
 * Constant for line item block.
 */
const LineItemBlock = require('../../LineItemBlock');
/**
 * Constant for { detected annotation }.
 */
const { DETECTED_ANNOTATION } = require('../../Annotation');
/**
 * Constant for { min x from page items }.
 */
const { minXFromPageItems } = require('../../../util/page-item-functions');

// Gathers lines to blocks
module.exports = class GatherBlocks extends ToLineItemBlockTransformation {
    constructor() {
        super('Gather Blocks');
    }

    transform(parseResult /*: ParseResult */) /*: ParseResult */ {
        const { mostUsedDistance } = parseResult.globals;
        var createdBlocks = 0;
        var lineItemCount = 0;
        parseResult.pages.map((page) => {
            lineItemCount += page.items.length;
            const blocks = [];
            var stashedBlock = new LineItemBlock({});
            const flushStashedItems = () => {
                if (stashedBlock.items.length > 1) {
                    stashedBlock.annotation = DETECTED_ANNOTATION;
                }

                blocks.push(stashedBlock);
                stashedBlock = new LineItemBlock({});
                createdBlocks++;
            };

            var minX = minXFromPageItems(page.items);
            page.items.forEach((item) => {
                if (stashedBlock.items.length > 0 && shouldFlushBlock(stashedBlock, item, minX, mostUsedDistance)) {
                    flushStashedItems();
                }
                stashedBlock.addItem(item);
            });
            if (stashedBlock.items.length > 0) {
                flushStashedItems();
            }
            page.items = blocks;
        });

        return new ParseResult({
            ...parseResult,
            messages: ['Gathered ' + createdBlocks + ' blocks out of ' + lineItemCount + ' line items'],
        });
    }
};

/**
 * Checks flush block.
 */
function shouldFlushBlock(stashedBlock, item, minX, mostUsedDistance) {
    if (stashedBlock.type && stashedBlock.type.mergeFollowingNonTypedItems && !item.type) {
        return false;
    }
    const lastItem = stashedBlock.items[stashedBlock.items.length - 1];
    const hasBigDistance = bigDistance(lastItem, item, minX, mostUsedDistance);
    if (
        stashedBlock.type &&
        stashedBlock.type.mergeFollowingNonTypedItemsWithSmallDistance &&
        !item.type &&
        !hasBigDistance
    ) {
        return false;
    }
    if (item.type !== stashedBlock.type) {
        return true;
    }
    if (item.type) {
        return !item.type.mergeToBlock;
    } else {
        return hasBigDistance;
    }
}

/**
 * Handles big distance.
 */
function bigDistance(lastItem, item, minX, mostUsedDistance) {
    const distance = lastItem.y - item.y;
    if (distance < 0 - mostUsedDistance / 2) {
        // distance is negative - and not only a bit
        return true;
    }
    var allowedDisctance = mostUsedDistance + 1;
    if (lastItem.x > minX && item.x > minX) {
        // intended elements like lists often have greater spacing
        allowedDisctance = mostUsedDistance + mostUsedDistance / 2;
    }
    if (distance > allowedDisctance) {
        return true;
    }
    return false;
}
