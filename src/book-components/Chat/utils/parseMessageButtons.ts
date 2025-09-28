/**
 * Represents a parsed message button from markdown
 *
 * @public exported from `@promptbook/components`
 */
export type MessageButton = {
    text: string;
    message: string;
};

/**
 * Parses markdown buttons in the format [Button Text](?message=Message%20to%20send)
 * Returns both the content without buttons and the extracted buttons
 *
 * @param content The markdown content that may contain buttons
 * @returns Object with contentWithoutButtons and buttons array
 *
 * @public exported from `@promptbook/components`
 */
export function parseMessageButtons(content: string): {
    contentWithoutButtons: string;
    buttons: MessageButton[];
} {
    const buttonRegex = /\[([^\]]+)\]\(\?message=([^)]+)\)/g;
    const buttons: MessageButton[] = [];
    let match;

    // Extract all buttons
    while ((match = buttonRegex.exec(content)) !== null) {
        const [, text, encodedMessage] = match;
        if (text && encodedMessage) {
            // Decode URL-encoded message
            const message = decodeURIComponent(encodedMessage);
            buttons.push({ text, message });
        }
    }

    // Remove buttons from content
    const contentWithoutButtons = content.replace(buttonRegex, '').trim();

    return {
        contentWithoutButtons,
        buttons,
    };
}
