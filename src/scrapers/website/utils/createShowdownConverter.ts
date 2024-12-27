import { Converter as ShowdownConverter } from 'showdown';

/**
 * Create a new showdown converter instance
 *
 * @private utility of `WebsiteScraper`
 */
export function createShowdownConverter() {
    return new ShowdownConverter({
        flavor: 'github',
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
}
