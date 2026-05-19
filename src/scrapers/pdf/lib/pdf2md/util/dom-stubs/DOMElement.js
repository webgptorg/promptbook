/* eslint-disable */

/**
 * Constant for DOM element serializer.
 */
const DOMElementSerializer = require('./DOMElementSerializer');
/**
 * Constant for xml encode.
 */
const xmlEncode = require('./xmlEncode');

/**
 * Minimal DOM element implementation used by pdf.js SVG serialization in Node.
 *
 * @private internal utility of pdf2md DOM stubs
 */
class DOMElement {
    constructor(name) {
        this.nodeName = name;
        this.childNodes = [];
        this.attributes = {};
        this.textContent = '';

        if (name === 'style') {
            this.sheet = {
                cssRules: [],
                insertRule(rule) {
                    this.cssRules.push(rule);
                },
            };
        }
    }

    getAttribute(name) {
        if (name in this.attributes) {
            return this.attributes[name];
        }

        return null;
    }

    getAttributeNS(namespace, name) {
        if (name in this.attributes) {
            return this.attributes[name];
        }

        if (namespace) {
            var suffix = ':' + name;
            for (var fullName in this.attributes) {
                if (fullName.slice(-suffix.length) === suffix) {
                    return this.attributes[fullName];
                }
            }
        }

        return null;
    }

    setAttribute(name, value) {
        this.attributes[name] = xmlEncode(value || '');
    }

    setAttributeNS(namespace, name, value) {
        this.setAttribute(name, value);
    }

    appendChild(element) {
        if (!this.childNodes.includes(element)) {
            this.childNodes.push(element);
        }
    }

    hasChildNodes() {
        return this.childNodes.length !== 0;
    }

    cloneNode() {
        var node = new DOMElement(this.nodeName);
        node.childNodes = this.childNodes;
        node.attributes = this.attributes;
        node.textContent = this.textContent;
        return node;
    }

    // This method is offered for convenience. It is recommended to directly use
    // getSerializer because that allows you to process the chunks as they come
    // instead of requiring the whole image to fit in memory.
    toString() {
        var buffer = [];
        var serializer = this.getSerializer();
        var chunk;

        while ((chunk = serializer.getNext()) !== null) {
            buffer.push(chunk);
        }

        return buffer.join('');
    }

    getSerializer() {
        return new DOMElementSerializer(this);
    }
}

module.exports = DOMElement;
