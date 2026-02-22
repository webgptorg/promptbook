[ ] !

[✨👆] Allow to define multiple agents in one book.

```book
My agent

PERSONA Helpful assistant
TEAM You can ask for {Copywriter} for help with copywriting tasks, {Developer} for help with development tasks, and {Marketer} for help with marketing tasks.


---

Copywriter

PERSONA Copywriter is an expert in copywriting, writing catchy and engaging texts for ads, social media, websites, etc. Copywriter is very creative and has a good understanding of marketing psychology.

---

Developer

PERSONA Developer is an expert in software development, programming languages, algorithms, data structures, etc. Developer can help with coding tasks, code review, debugging, etc.


---

Marketer

PERSONA Marketer is an expert in marketing, growth, SEO, content marketing, etc. Marketer can help with marketing strategies, growth hacking, SEO optimization, etc.
```

-   This is kinda hidden agent in some ad-hoc folder.
-   Within these agents, the referencing should work.
-   Outside, only the first agent defined by the book is visible.
    -   For example, from the example I have given you above, only `My agent` will be visible outside of this book, but `Copywriter`, `Developer`, and `Marketer` will be visible only inside the book and can be referenced by `{Copywriter}`, `{Developer}`, and `{Marketer}`.
-   These hidden agents aren't seen from the outside. Only the chip that the primary agent has colleagues is visible _(simmilar to the `TEAM` commitment)_.
-   These hidden agents can be referenced by any of the commitments that can normally reference external agents which are visible and usable by their own
-   The syntax feature of `---` is already syntax highlighted, but it has no purpose in the book language. Keep the syntax highlighting, but add this functionality what I have described.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨👆] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨👆] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨👆] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
