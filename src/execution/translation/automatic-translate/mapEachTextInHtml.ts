import spaceTrim from 'spacetrim';
import { Promisable } from 'type-fest';
import { DOMParser, XMLSerializer } from 'xmldom';

/**
 * Walks through the DOM and replaces all data (attribute values, inner text) by given map callback
 * @returns processed html as string
 */
export async function mapEachTextInHtml({
    html,
    map,
}: {
    html: string;
    map(options: { name: string; text: string }): Promisable<string>;
}): Promise<string> {
    const document = new DOMParser().parseFromString(
        spaceTrim(
            (block) => `

              <!DOCTYPE html>
              <html lang="cs" dir="ltr">
                <head>
                  <meta charset="UTF-8">
                </head>
                <body>
                  ${block(html)}
                </body>
              </html>

            `,
        ),
        'text/html',
    );

    // Recursively walks through the all children and attributes and replaces the text
    async function walk(node: Node) {
        if ((node as Element).attributes /*node instanceof Element*/) {
            for (const attribute of Object.values((node as Element).attributes)) {
                if (attribute.nodeValue) {
                    attribute.value = await map({ name: attribute.nodeName, text: attribute.value });
                }
            }
        }

        if (node.nodeType === 3 /* Node.TEXT_NODE */) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (node as any).data = await map({ name: 'text', text: (node as any).data });
        } else {
            if (node.childNodes) {
                for (const child of Array.from(node.childNodes)) {
                    await walk(child);
                }
            }
        }
    }

    await walk(document);

    const htmlSerialized = new XMLSerializer().serializeToString(document);
    const htmlSerializeContent = /<body>(?<content>.*)<\/body>/s.exec(htmlSerialized)!.groups!.content;
    return spaceTrim(htmlSerializeContent);
}
