[x]

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

---

[x]

[✨🕢] Make Counting Utilities working

-   In /utility/counting-utilities there should be a textarea where user can write or paste text
-   Below the textarea show the counts:
    -   Characters _(via `countCharacters` function_)
    -   Words _(via `countWords` function_)
    -   Sentences _(via `countSentences` function_)
    -   Paragraphs _(via `countParagraphs` function_)
    -   Lines _(via `countLines` function_)
    -   Pages _(via `countPages` function_)
-   For all of these functions there should be code preview how to use them
-   Counting Utilities are in http://localhost:4022/utility/counting-utilities
-   Book components website is in `/book-components` running in http://localhost:4022/
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨🕢] Make Counting Utilities in same design as rest of the `book-components` website

-   Book components website is in `/book-components` running in http://localhost:4022/
-   Counting utilities are in http://localhost:4022/utility/counting-utilities
-   They dont look quite like rest of the website now, for example http://localhost:4022/utility/humanize-ai-text, http://localhost:4022/component/chat?scenario=chatWithFeedback, http://localhost:4022/component/book-editor
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨🕢] Make Humanize AI Text default value

-   The textarea in /utility/humanize-ai-text should have some default text
-   Humanized version should be shown on load as well
-   Humanize AI Text is in http://localhost:4022/utility/humanize-ai-text
-   Book components website is in `/book-components` running in http://localhost:4022/
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

The default is:

```
“The City Between Stones and Stars”

“Prague never lets you go... this dear little mother has claws.”
— Franz Kafka

Beneath her bridges, the Vltava hums,
a silver thread through labyrinthine dreams.
Cobblestones remember footsteps
of alchemists, lovers, and kings.
```

---

[x]

[✨🕢] Make Humanize AI Text more like translator

-   Textareas should be side by side, not one above another
-   On mobile show one above another _(like now)_
-   Inspired by DeepL and Google Translate UI
-   Humanize AI Text is in http://localhost:4022/utility/humanize-ai-text
-   Book components website is in `/book-components` running in http://localhost:4022/
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨🕢] Make Humanize AI Text working automatically

-   When user types or pastes text into the input textarea, the output textarea should update automatically
-   The button "Humanize" can be moved on bottom and its purpose will be mainly the indication of humanization process
-   Put a small debounce of 100ms so it does not update on every keystroke immediately
-   Humanize AI Text is in http://localhost:4022/utility/humanize-ai-text
-   Book components website is in `/book-components` running in http://localhost:4022/
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨🕢] quux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨🕢] quux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨🕢] quux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨🕢] quux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨🕢] quux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
