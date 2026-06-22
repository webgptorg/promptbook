export type ReplyCheck = {
    readonly status: 'ok' | 'warn';
    readonly text: string;
};

/**
 * Boundary to the `evaluateAgentReply` server function — judges a proposed reply against
 * the book and returns pass/warn checks for the Test step's result panel.
 *
 * @param input - Current Book source, customer input, and generated preview reply.
 * @returns Lightweight local checks for the preview result.
 */
export async function evaluateReply(input: {
    readonly bookSource: string;
    readonly customerEmail: string;
    readonly reply: string;
}): Promise<ReplyCheck[]> {
    return [
        {
            status: input.bookSource.trim() && input.reply.trim() ? 'ok' : 'warn',
            text: input.bookSource.trim()
                ? 'Book je pro testovací běh vyplněný.'
                : 'Book je prázdný, odpověď je pouze obecný náhled.',
        },
        {
            status: input.customerEmail.trim() ? 'ok' : 'warn',
            text: input.customerEmail.trim() ? 'Testovací vstup je vyplněný.' : 'Doplňte testovací vstup.',
        },
    ];
}
