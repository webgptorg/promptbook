/**
 * Produces insertion metadata for one dictated chunk.
 *
 * @private function of `useChatInputAreaDictation`
 */
export function insertDictationChunk(params: {
    readonly currentValue: string;
    readonly dictatedText: string;
    readonly selectionStart: number;
    readonly selectionEnd: number;
    readonly shouldReplaceSelection: boolean;
}): { nextValue: string; start: number; caret: number } {
    const { currentValue, dictatedText, selectionStart, selectionEnd, shouldReplaceSelection } = params;
    const replaceStart = selectionStart;
    const replaceEnd = shouldReplaceSelection ? selectionEnd : selectionStart;
    const prefix = currentValue.slice(0, replaceStart);
    const suffix = currentValue.slice(replaceEnd);
    const previousCharacter = prefix.slice(-1);
    const needsLeadingSpace = Boolean(
        prefix &&
            previousCharacter &&
            !/\s/.test(previousCharacter) &&
            !dictatedText.startsWith('\n') &&
            !/^[,.;:!?)]/.test(dictatedText),
    );

    const inserted = `${needsLeadingSpace ? ' ' : ''}${dictatedText}`;
    const nextValue = `${prefix}${inserted}${suffix}`;
    const start = replaceStart + (needsLeadingSpace ? 1 : 0);
    const caret = prefix.length + inserted.length;

    return {
        nextValue,
        start,
        caret,
    };
}
