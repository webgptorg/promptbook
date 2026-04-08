[ ]

[✨🦈] Modify comments that mark code as not publishable to some package

**Change for example this:**

```typescript
// ... some code ...

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
```

**To this:**

```typescript
// ... some code ...

/**
 * Note: [⚫] Code that generates [pitch deck](other/pitch-deck/pitch-deck-code.ts) should never be published in any package
 */
```

-   Add the file identification and the reason why this code should not be published to certain packages, this will help to understand the context and avoid confusion in the future.
-   Search for all the places in the codebase where there are comments that mark code as not publishable, and modify them to include the file identification and the reason.
-   You can use Markdown formatting
-   There are several markers that makes code unpublishable:
    -   [⚫] Code in this file should never be published in any package
    -   [🟢] Code in this file should never be published into packages that could be imported into browser environment
    -   [🔵] Code in this file should never be published outside of `@promptbook/browser`
    -   [🟡] Code in this file should never be published outside of `@promptbook/cli`
    -   But search just for tags like "[⚫]"
