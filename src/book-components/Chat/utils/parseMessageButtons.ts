/**
 * Represents a quick message button parsed from chat markdown.
 *
 * @private internal helper type of `MessageButton`
 */
export type MessageQuickButton = {
    type: 'message';
    text: string;
    message: string;
};

/**
 * Represents a quick action button parsed from chat markdown.
 *
 * @private internal helper type of `MessageButton`
 */
export type ActionQuickButton = {
    type: 'action';
    text: string;
    code: string;
};

/**
 * Represents one parsed quick button from chat markdown.
 *
 * @public exported from `@promptbook/components`
 */
export type MessageButton = MessageQuickButton | ActionQuickButton;

/**
 * Extracts one quick button definition from a markdown link query string.
 *
 * @param text The visible button label.
 * @param query Raw query-string payload captured from markdown.
 * @returns Parsed quick button definition or `null` when the link is not a supported quick button.
 * @private internal helper of `parseMessageButtons`
 */
function parseQuickButtonDefinition(text: string, query: string): MessageButton | null {
    const searchParams = new URLSearchParams(query);
    const message = searchParams.get('message');

    if (message !== null) {
        return {
            type: 'message',
            text,
            message,
        };
    }

    const code = searchParams.get('action');

    if (code !== null) {
        return {
            type: 'action',
            text,
            code,
        };
    }

    return null;
}

/**
 * Parses markdown quick buttons in the format `[Button Text](?message=...)` or `[Button Text](?action=...)`.
 * Returns both the content without supported quick buttons and the extracted button definitions.
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
    const buttonRegex = /\[([^\]]+)\]\(\?([^)]+)\)/g;
    const buttons: MessageButton[] = [];
    const contentWithoutButtons = content
        .replace(buttonRegex, (match, text: string, query: string) => {
            const button = parseQuickButtonDefinition(text, query);

            if (!button) {
                return match;
            }

            buttons.push(button);
            return '';
        })
        .trim();

    return {
        contentWithoutButtons,
        buttons,
    };
}
