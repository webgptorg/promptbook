/**
 * Constant for { enum }.
 */
const { Enum } = require('enumify');

// The format of a word element
/**
 * Class implementing word format.
 */
class WordFormat extends Enum {}

module.exports = WordFormat;

WordFormat.initEnum({
    BOLD: {
        startSymbol: '**',
        endSymbol: '**',
    },
    OBLIQUE: {
        startSymbol: '_',
        endSymbol: '_',
    },
    BOLD_OBLIQUE: {
        startSymbol: '**_',
        endSymbol: '_**',
    },
});
