/* eslint-disable */

/**
 * Escapes XML-sensitive characters used by the PDF.js DOM serializer stubs.
 *
 * @private internal utility of pdf2md DOM stubs
 */
function xmlEncode(value) {
    var index = 0;
    var character;
    var string = String(value);

    while (
        index < string.length &&
        (character = string[index]) !== '&' &&
        character !== '<' &&
        character !== '"' &&
        character !== '\n' &&
        character !== '\r' &&
        character !== '\t'
    ) {
        index++;
    }

    if (index >= string.length) {
        return string;
    }

    var buffer = string.substring(0, index);

    while (index < string.length) {
        character = string[index++];

        switch (character) {
            case '&':
                buffer += '&amp;';
                break;
            case '<':
                buffer += '&lt;';
                break;
            case '"':
                buffer += '&quot;';
                break;
            case '\n':
                buffer += '&#xA;';
                break;
            case '\r':
                buffer += '&#xD;';
                break;
            case '\t':
                buffer += '&#x9;';
                break;
            default:
                buffer += character;
                break;
        }
    }

    return buffer;
}

module.exports = xmlEncode;
