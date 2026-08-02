[ ]

[✨🌻] The Mango wizard should create a book directly on the second page without the intermediate step of creating some markdown

-   Now you write the title and description. From the title and description, it is created some middleware markdown, and from this markdown is created the final book. Simplify this process so that from the title and description, the book will be created directly, and the user will manipulate and edit the book in the book editor directly without seeing this confusing markdown.
-   Just generate book, skip the draft
-   The buttons should just add sections to the book, not to the draft
    -   -   Příklady odpovědí
    -   -   Eskalace
    -   -   Podpis / šablona
    -   -   Zakázaná témata
    -   -   Vlastní sekce
    -   Look at https://live.ptbk.io/api/docs/book-language.md?language=en
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

![Just generate book, skip the draft](screenshots/2026-07-0610-agents-server-mango-onboarding-baz-2.png)
![alt text](screenshots/2026-07-0610-agents-server-mango-onboarding-baz.png)
![alt text](screenshots/2026-07-0610-agents-server-mango-onboarding-baz-1.png)
