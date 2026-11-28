/* eslint-disable */

/**
 * Constant for xml encode.
 */
const xmlEncode = require('./xmlEncode');

/**
 * Incrementally serializes DOM stub elements in the same shape expected by pdf.js.
 *
 * @private helper of DOMElement
 */
class DOMElementSerializer {
    constructor(node) {
        this._node = node;
        this._state = 0;
        this._loopIndex = 0;
        this._attributeKeys = null;
        this._childSerializer = null;
    }

    /**
     * Yields the next chunk in the serialization of the element.
     *
     * @returns {string|null} null if the element has fully been serialized.
     */
    getNext() {
        var node = this._node;

        switch (this._state) {
            case 0:
                ++this._state;
                return '<' + node.nodeName;
            case 1:
                ++this._state;
                if (node.nodeName === 'svg:svg') {
                    return ' xmlns:xlink="http://www.w3.org/1999/xlink"' + ' xmlns:svg="http://www.w3.org/2000/svg"';
                }
            case 2:
                ++this._state;
                this._loopIndex = 0;
                this._attributeKeys = Object.keys(node.attributes);
            case 3:
                if (this._loopIndex < this._attributeKeys.length) {
                    var name = this._attributeKeys[this._loopIndex++];
                    return ' ' + name + '="' + xmlEncode(node.attributes[name]) + '"';
                }

                ++this._state;
                return '>';
            case 4:
                if (node.nodeName === 'svg:tspan' || node.nodeName === 'svg:style') {
                    this._state = 6;
                    return xmlEncode(node.textContent);
                }

                ++this._state;
                this._loopIndex = 0;
            case 5:
                while (true) {
                    var value = this._childSerializer && this._childSerializer.getNext();
                    if (value !== null) {
                        return value;
                    }

                    var nextChild = node.childNodes[this._loopIndex++];
                    if (!nextChild) {
                        this._childSerializer = null;
                        ++this._state;
                        break;
                    }

                    this._childSerializer = new DOMElementSerializer(nextChild);
                }
            case 6:
                ++this._state;
                return '</' + node.nodeName + '>';
            case 7:
                return null;
            default:
                throw new Error('Unexpected serialization state: ' + this._state);
        }
    }
}

module.exports = DOMElementSerializer;
