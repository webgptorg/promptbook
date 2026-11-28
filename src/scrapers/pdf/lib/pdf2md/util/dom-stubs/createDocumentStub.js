/* eslint-disable */

/**
 * Constant for DOM element.
 */
const DOMElement = require('./DOMElement');

/**
 * Creates the minimal document stub expected by pdf.js in Node-like environments.
 *
 * @private internal utility of pdf2md DOM stubs
 */
function createDocumentStub() {
    return {
        childNodes: [],

        get currentScript() {
            return { src: '' };
        },

        get documentElement() {
            return this;
        },

        createElementNS(namespace, element) {
            return new DOMElement(element);
        },

        createElement(element) {
            return this.createElementNS('', element);
        },

        getElementsByTagName(element) {
            if (element === 'head') {
                return [this.head || (this.head = new DOMElement('head'))];
            }

            return [];
        },
    };
}

module.exports = createDocumentStub;
