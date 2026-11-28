[x]

[✨🔂] Mark all idempotent functions across the codebase

-   Each function that is idempotent should have a text "Note: [🔂] This function is idempotent." in its JSDoc comment.

For example:

```typescript
/**
 * Function `humanizeAiText` will remove traces of AI text generation artifacts
 *
 * Note: [🔂] This function is idempotent.
 * Tip: If you want more control, look for other functions for example `humanizeAiTextEmdashed` exported `@promptbook/markdown-utils`
 *
 * @public exported from `@promptbook/markdown-utils`
 */
export function humanizeAiText(aiText: string_markdown): string_markdown {
    // ...
}
```
