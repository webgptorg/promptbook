import { spaceTrim } from 'spacetrim';

/**
 * Builds the prompt sent to the selected coding runner for one queued user-thread book.
 */
export function buildAgentMessagePrompt(messageRelativePath: string, agentSystemMessage: string): string {
    return spaceTrim(
        (block) =>
            `
                # Answer 1 user question

                -   Read \`${messageRelativePath}\` and answer the most recent \`MESSAGE @User\`
                -   Only change the queued message file by appending one new \`MESSAGE @Agent\` block
                -   Do not modify any other file in the repository

                ## Rules for the answering

                ## Formatting

                - You can use Markdown formatting in the messages like **bold** or *italic*

                ## Sources and citations

                Mark sources and citations like this "【https://example.com/document123.pdf 】"

                At the same time, you can write sources naturally in the text of the answers

                For example:

                > According to paragraph §745b, the fee can be waived for a person over 65 years old. 【https://praha13.cz/2026/paragraph-745.doc】

                - "paragraph §745b" fits naturally in the text.
                - "【https://praha13.cz/2026/paragraph-745.doc】" The exact format of the quote is important for further processing of the answer.
                - The "【" and "】" symbols are used to mark the source and will be parsed, inside should be valid URL used as a source for the answer.

                ## Quick buttons

                If there is a meaningful follow-up procedure, use quick buttons at the end of the answer:

                \`\`\`
                How big is the contract you are posting?

                [Up to 50,000 CZK](?message=We are posting an order up to 50,000 CZK)
                [Up to 100,000 CZK](?message=We are posting an order up to 100,000 CZK)
                [Over 100,000 CZK](?message=We are posting an order over 100,000 CZK)
                \`\`\`


                ## This is how you should behave

                ${block(agentSystemMessage)}
            `,
    );
}
