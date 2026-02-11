[x] ~$0.42 19 minutes by OpenAI Codex `gpt-5.3-codex`

[✨❕] Allow to citate sources like "【document123.doc】"

-   It is already supported to create a chip from this notation "【7:15†document123.doc】"
-   But it is not supported to create a chip from the simplified notation "【document123.doc】"
-   Show the same source chip for both notations, and make sure that the source is properly linked to the document
-   Should have exactly same behavior as the full notation.
-   Keep in mind the DRY _(don't repeat yourself)_ principle, abstract the common logic for handling both notations and make it reusable across the application.
-   You can just internally transform the simplified notation to the full notation and then use the existing logic for handling the full notation.
    -   For example, when the user inputs "【document123.doc】", you can transform it to "【0:0†document123.doc】" and then use the existing logic for handling the full notation.
    -   Or create some similar internal representation for the sources and then transform both notations to this internal representation and use the existing logic for handling the full notation.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨❕] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨❕] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨❕] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

