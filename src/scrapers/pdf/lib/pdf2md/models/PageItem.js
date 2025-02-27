// A abstract PageItem class, can be TextItem, LineItem or LineItemBlock
module.exports = class PageItem {
	constructor(options) {
		if (this.constructor === PageItem) {
			throw new TypeError("Can not construct abstract class.");
		}
		this.type = options.type;
		this.annotation = options.annotation;
		this.parsedElements = options.parsedElements;
	}
};
