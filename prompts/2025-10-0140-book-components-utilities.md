[ ]

[✨🕢] Add utilities section to book components website

-   The website currently shows the components available from `@promptbook/components`
-   I want to expand it to also show functions and other utilities
-   These utilities do not have a visual representation like components, but they are still useful
-   There will be two types of usefullness:
    1.  "Miniapp" around a utility function, e.g. a text area where you can paste text and see the output of `humanizeAiText` function, kinda like a DeepL or Google Translate for that specific utility
    2.  Just documentation about the utility function, what it does, how to use it, with code examples for developers
-   So that usage example wont be around a React component, but around a utility function
-   Show functions which are exported from `@promptbook/utils` and `@promptbook/markdown-utils`
-   As a first version make this for [humanizeAiText](src/utils/markdown/humanizeAiText.ts) and [counting utilities](src/utils/expectation-counters/index.ts)
-   Now it is showing `8 Components, 4 Categories, 100% Open Source`, it should show `X Components, X Utilities, X Categories, 100% Open Source`
-   Book components website is in `/book-components` running in http://localhost:4022/
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨🕢] quux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨🕢] quux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨🕢] quux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`
