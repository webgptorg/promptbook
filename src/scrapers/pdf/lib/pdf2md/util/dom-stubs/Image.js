/* eslint-disable */

/**
 * Minimal image stub that mirrors the PDF.js expectation of a synchronous `onload`.
 *
 * @private internal utility of pdf2md DOM stubs
 */
class Image {
    constructor() {
        this._src = null;
        this.onload = null;
    }

    get src() {
        return this._src;
    }

    set src(value) {
        this._src = value;

        if (this.onload) {
            this.onload();
        }
    }
}

module.exports = Image;
