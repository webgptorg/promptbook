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
 * Constant for line item.
 */
const LineItem = require('../../LineItem');
/**
 * Constant for stashing stream.
 */
const StashingStream = require('../../StashingStream');
/**
 * Constant for { removed annotation, added annotation }.
 */
const { REMOVED_ANNOTATION, ADDED_ANNOTATION } = require('../../Annotation');

// Converts vertical text to horizontal
module.exports = class VerticalToHorizontal extends ToLineItemTransformation {
    constructor() {
        super('Vertical to Horizontal Text');
    }

    transform(parseResult /*: ParseResult */) /*: ParseResult */ {
        var foundVerticals = 0;
        parseResult.pages.forEach((page) => {
            const stream = new VerticalsStream();
            stream.consumeAll(page.items);
            page.items = stream.complete();
            foundVerticals += stream.foundVerticals;
        });

        return new ParseResult({
            ...parseResult,
            messages: ['Converted ' + foundVerticals + ' verticals'],
        });
    }
};

/**
 * Class implementing verticals stream.
 */
class VerticalsStream extends StashingStream {
    constructor() {
        super();
        this.foundVerticals = 0;
    }

    shouldStash(item) {
        return item.words.length === 1 && item.words[0].string.length === 1;
    }

    doMatchesStash(lastItem, item) {
        return lastItem.y - item.y > 5 && lastItem.words[0].type === item.words[0].type;
    }

    doFlushStash(stash, results) {
        if (stash.length > 5) {
            // unite
            var combinedWords = [];
            var minX = 999;
            var maxY = 0;
            var sumWidth = 0;
            var maxHeight = 0;
            stash.forEach((oneCharacterLine) => {
                oneCharacterLine.annotation = REMOVED_ANNOTATION;
                results.push(oneCharacterLine);
                combinedWords.push(oneCharacterLine.words[0]);
                minX = Math.min(minX, oneCharacterLine.x);
                maxY = Math.max(maxY, oneCharacterLine.y);
                sumWidth += oneCharacterLine.width;
                maxHeight = Math.max(maxHeight, oneCharacterLine.height);
            });
            results.push(
                new LineItem({
                    ...stash[0],
                    x: minX,
                    y: maxY,
                    width: sumWidth,
                    height: maxHeight,
                    words: combinedWords,
                    annotation: ADDED_ANNOTATION,
                }),
            );
            this.foundVerticals++;
        } else {
            // add as singles
            results.push(...stash);
        }
    }
}
