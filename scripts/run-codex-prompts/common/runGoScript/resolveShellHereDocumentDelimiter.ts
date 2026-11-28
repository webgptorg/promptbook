/** Chooses a delimiter absent from Book text so untrusted instructions stay stdin data, never shell code. */
export function resolveShellHereDocumentDelimiter(baseDelimiter: string, content: string): string {
    const lines = new Set(content.replace(/\r\n/gu, '\n').split('\n'));
    let delimiter = baseDelimiter;
    let suffix = 0;
    while (lines.has(delimiter)) delimiter = `${baseDelimiter}_${++suffix}`;
    return delimiter;
}
