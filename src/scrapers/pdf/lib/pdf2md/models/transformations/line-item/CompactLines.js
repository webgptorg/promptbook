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
 * Constant for text item line grouper.
 */
const TextItemLineGrouper = require('../../TextItemLineGrouper');
/**
 * Constant for line converter.
 */
const LineConverter = require('../../LineConverter');
/**
 * Constant for block type.
 */
const BlockType = require('../../markdown/BlockType');
/**
 * Constant for { removed annotation, added annotation }.
 */
const { REMOVED_ANNOTATION, ADDED_ANNOTATION } = require('../../Annotation');

// gathers text items on the same y line to one line item
module.exports = class CompactLines extends ToLineItemTransformation {
    constructor() {
        super('Compact To Lines');
    }

    transform(parseResult /*: ParseResult */) /*: ParseResult */ {
        const { mostUsedDistance, fontToFormats } = parseResult.globals;
        const foundFootnotes = [];
        const foundFootnoteLinks = [];
        var linkCount = 0;
        var formattedWords = 0;

        const lineGrouper = new TextItemLineGrouper({
            mostUsedDistance: mostUsedDistance,
        });
        const lineCompactor = new LineConverter(fontToFormats);

        parseResult.pages.forEach((page) => {
            if (page.items.length > 0) {
                const lineItems = [];
                const textItemsGroupedByLine = lineGrouper.group(page.items);
                textItemsGroupedByLine.forEach((lineTextItems) => {
                    const lineItem = lineCompactor.compact(lineTextItems);
                    if (lineTextItems.length > 1) {
                        lineItem.annotation = ADDED_ANNOTATION;
                        lineTextItems.forEach((item) => {
                            item.annotation = REMOVED_ANNOTATION;
                            lineItems.push(
                                new LineItem({
                                    ...item,
                                }),
                            );
                        });
                    }
                    if (lineItem.words.length === 0) {
                        lineItem.annotation = REMOVED_ANNOTATION;
                    }
                    lineItems.push(lineItem);

                    if (lineItem.parsedElements.formattedWords) {
                        formattedWords += lineItem.parsedElements.formattedWords;
                    }
                    if (lineItem.parsedElements.containLinks > 0) {
                        linkCount++;
                    }
                    if (lineItem.parsedElements.footnoteLinks.length > 0) {
                        const footnoteLinks = lineItem.parsedElements.footnoteLinks.map((footnoteLink) => ({
                            footnoteLink,
                            page: page.index + 1,
                        }));
                        foundFootnoteLinks.push.apply(foundFootnoteLinks, footnoteLinks);
                    }
                    if (lineItem.parsedElements.footnotes.length > 0) {
                        lineItem.type = BlockType.FOOTNOTES;
                        const footnotes = lineItem.parsedElements.footnotes.map((footnote) => ({
                            footnote,
                            page: page.index + 1,
                        }));
                        foundFootnotes.push.apply(foundFootnotes, footnotes);
                    }
                });
                page.items = lineItems;
            }
        });

        return new ParseResult({
            ...parseResult,
            messages: [
                'Detected ' + formattedWords + ' formatted words',
                'Found ' + linkCount + ' links',
                'Detected ' + foundFootnoteLinks.length + ' footnotes links',
                'Detected ' + foundFootnotes.length + ' footnotes',
            ],
        });
    }
};
