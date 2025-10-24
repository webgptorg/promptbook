import { languages } from 'monaco-editor';

export const bookLanguageDefinition: languages.IMonarchLanguage = {
    tokenizer: {
        root: [
            [/^#.*$/m, 'comment'],
            [/^>.*$/m, 'string'],
            [/^---$/m, 'delimiter'],
            [/^@\w+/m, 'keyword'],
            [/^{\w+}/m, 'keyword'],
            [/\[[^\]]+\]\([^)]+\)/m, 'string'],
            [/`[^`]+`/m, 'string'],
            [/\b(TITLE|AUTHOR|VERSION|NOTE|NOTES|COMMENT|NONCE|META|KNOWLEDGE|PARAMETER|INPUT|OUTPUT|EVALUATE|EXPECT|DO)\b/m, 'keyword'],
        ],
    },
};
