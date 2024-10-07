import { Converter } from 'showdown';

/**
 * A converter instance that uses showdown and highlight extensions
 *
 * @type {Converter}
 * @private for markdown and html knowledge scrapers
 */
export const markdownConverter = new Converter({
    flavor: 'github', // <- TODO: !!!!!! Explicitly specify the flavor of promptbook markdown
    /*
    > import showdownHighlight from 'showdown-highlight';
    > extensions: [
    >     showdownHighlight({
    >         // Whether to add the classes to the <pre> tag, default is false
    >         pre: true,
    >         // Whether to use hljs' auto language detection, default is true
    >         auto_detection: true,
    >     }),
    > ],
    */
});

/**
 * TODO: !!!!!! Figure out better name not to confuse with `Converter`
 * TODO: !!!!!! Lazy-make converter
 */
