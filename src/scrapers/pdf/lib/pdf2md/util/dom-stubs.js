/* eslint-disable */

/**
 * Constant for create document stub.
 */
const createDocumentStub = require('./dom-stubs/createDocumentStub');
/**
 * Constant for image.
 */
const Image = require('./dom-stubs/Image');

/**
 * DOM document stub used by pdf.js when no browser globals are available.
 *
 * @private internal utility of pdf2md DOM stubs
 */
const document = createDocumentStub();

exports.document = document;
exports.Image = Image;

/**
 * Constant for stub export names.
 */
const STUB_EXPORT_NAMES = Object.keys(exports);

/**
 * Applies the DOM-related stubs to the provided namespace.
 *
 * @private internal utility of pdf2md DOM stubs
 */
function setStubs(namespace) {
    STUB_EXPORT_NAMES.forEach((key) => {
        console.assert(!(key in namespace), 'property should not be set: ' + key);
        namespace[key] = exports[key];
    });
}

/**
 * Removes the DOM-related stubs from the provided namespace.
 *
 * @private internal utility of pdf2md DOM stubs
 */
function unsetStubs(namespace) {
    STUB_EXPORT_NAMES.forEach((key) => {
        console.assert(key in namespace, 'property should be set: ' + key);
        delete namespace[key];
    });
}

exports.setStubs = setStubs;
exports.unsetStubs = unsetStubs;
