[x] ~$0.2948 34 minutes by OpenAI Codex `gpt-5.3-codex`

[✨🧖] Isolate Monaco Editor instances into their own Shadow DOM

-   Currently, all Monaco Editor instances in the Agents Server are rendered in the same DOM tree, which can cause conflicts and issues with styles and functionality.
-   This is relevant for both `BookEditor` and other Monaco editor instances, which are showing different syntaxes.
-   Keep in mind the DRY _(don't repeat yourself)_ principle. The outside usage of the Monaco editor should be similar as it is now. Wrap this isolation feature into a reusable component that can be used for any Monaco Editor instance in the future, without the need to change the way we use the Monaco Editor in the codebase.
-   It should be enough to change `<MonacoEditor ... />` to `<MonacoEditorWithShadowDom ... />` to use the new component.
-   Do a proper analysis of the current functionality and monaco editor usage before you start implementing.
-   The outside point of view: nothing should change. This is just internal refactoring.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🧖] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🧖] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🧖] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

