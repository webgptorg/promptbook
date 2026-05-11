/**
 * Builds the prompt sent to the selected coding runner for one queued user message.
 */
export function buildAgentMessagePrompt(messageRelativePath: string): string {
    return [
        'Answer 1 user question',
        '',
        `-   Look at folder [user question](${messageRelativePath}) and answer it`,
        '-   Start your answer with line containing "MESSAGE @Agent"',
        '-   Only thing you should change in the repository is to add answer to the most recent message, nothing else',
        '-   You should behave according to [your instructions](agent.book) which are explained in [the book manual](docs/book-language-manual.md)',
        '-   The knowledge you are working with is in the `knowledge` folder, you can use it to find the answer to the question. You can also use it to find relevant information that can help you answer the question.',
    ].join('\n');
}
