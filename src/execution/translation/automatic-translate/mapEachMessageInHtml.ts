import { Promisable } from 'type-fest';
import { mapEachTextInHtml } from './mapEachTextInHtml';

/**
 * Walks through the DOM and replaces all messages shown to user (inner text, title attributes; not URLs, css classes) by given map callback
 * It is usefull to use in combination with translation
 * @returns processed html as string
 */

export async function mapEachMessageInHtml({
    html,
    map,
}: {
    html: string;
    map(message: string): Promisable<string>;
}): Promise<string> {
    return mapEachTextInHtml({
        html,
        async map({ name, text }) {
            if (['text', 'title'].includes(name)) {
                return await map(text);
            } else {
                return text;
            }
        },
    });
}
