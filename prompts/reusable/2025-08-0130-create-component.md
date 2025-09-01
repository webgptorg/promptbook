[x]

[✨💞] Create component `AvatarProfile` and `AvatarProfileFromSource`

This should show the box with user avatar, name and description.
Its bit similar to the `<AvatarChip />` component but larger and with bit more details.

-   Take inspiration from other components here `/src/book-components/`
    -   Especially `/src/book-components/AvatarProfile/AvatarChip/AvatarChip.tsx`
-   Put in under `/src/book-components/AvatarProfile/AvatarProfile`
-   Make both `.tsx` and `.module.css` files
-   Make preview component
    -   Look at folder `/scripts/book-components/src/components`
    -   The `component.json` should look like other `component.json`s
    -   Look how other previews are made
        -   Make a preview component
        -   Also a `component.json` file
        -   Register it in `/scripts/book-components/src/components/ComponentPreview.tsx`
-   Keep in mind DRY (Don't Repeat Yourself) principle

---

[ ]

[✨💞] Create component `TeamGraph`

This should show multiple avatars and their relationships in the graph

-   Take inspiration from other components here `/src/book-components/`
    -   Especially `mermaid-social-graph` it should be based on this mermaid graph
-   Put in under `/src/book-components/AvatarProfile/AvatarProfile`
-   Make both `.tsx` and `.module.css` files
-   Make preview component
    -   Look at folder `/scripts/book-components/src/components`
    -   Look how other previews are made
        -   Make a preview component
        -   Also a `component.json` file
        -   Register it in `/scripts/book-components/src/components/ComponentPreview.tsx`
-   Keep in mind DRY (Don't Repeat Yourself) principle

---

[x]

[✨💞] Create component `LlmChat` component

This should show same chat as [Chat component](/src/book-components/Chat/Chat/Chat.tsx) but allow to chat with LLM modal

-   Put in under `/src/book-components/Chat/LlmChat/LlmChat.tsx`
-   Use [Chat component](/src/book-components/Chat/Chat/Chat.tsx) internally
-   Derive `LlmChatProps` from `ChatProps`
-   You wont pass `messages`, `onMessage`, `tasksProgress` and `participants`
    -   `messages` and `onMessage`
    -   `onChange` will be still present `LlmChatProps` will report the changes to callback
    -   `tasksProgress` will be handled internally
    -   `participants` will be generated from `llmTools`
    -   There will be `llmTools` prop
-   Internally in the component you will use `useState` to manage `messages` and `tasksProgress` and show them via `Chat` component
-   You are chatting with the LLM passed via `llmTools`, chatting via method `callChatModel`
-   Make also the preview component `LlmChatPreview`
    -   Use `MockedEchoLlmExecutionTools` in the preview
    -   Look at folder `/scripts/book-components/src/components`
    -   Look how other previews are made
        -   Make a preview component
        -   Also a `component.yaml` file
        -   Register it in `/scripts/book-components/src/components/ComponentPreview.tsx`
-   Keep in mind DRY (Don't Repeat Yourself) principle

---

[ ]

[✨💞] Add `isPersistent` prop to `LlmChat`
