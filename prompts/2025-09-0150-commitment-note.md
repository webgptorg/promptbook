[x]

[✨🏬] Make syntax highlighting for `NOTE` commitment

-   `NOTE` commitment have role of code comment, similar to `//` and `/* */` in javascript
-   The entire commitment should be gray color, simmilar to code comments highlighting in IDEs
-   Commitment consists of two parts - the `NOTE` keyword and the text after it, it continues until next commitment or end of the agent source
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[x]

[✨🏬] `NOTE` commitment should have `COMMENT` and `NONCE` alias

-   All of these commitments have role of code comments, with just different notation, similar to `//` and `/* */` in javascript
-   Both syntaxes are equivalent:

    ```book
    NOTE This is note that not affect the agent behavior
    ```

    ```book
    COMMENT This is some comment that not affect the agent behavior
    ```

    ```book
    NONCE This is some information that not affect the agent behavior
    ```

-   Keep in mind the DRY _(don't repeat yourself)_ principle - use same CommitmentDefinition class for both aliases, simmilar to for example existing `RULE` and `RULES` aliases
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨🏬] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨🏬] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`
