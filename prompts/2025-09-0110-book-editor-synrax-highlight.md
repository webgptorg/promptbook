[x]

[✨🐬] Syntax highlighting in `<BookEditor/>` should highlight more commitments:

-   Add commitment `GOAL` The main goal which should be achieved by the AI assistant. There can be multiple goals. Later goals are more important than earlier goals.
-   Add commitment `MEMORY` Similar to `KNOWLEDGE` but has a focus on remembering past interactions and user preferences.
-   Add commitment `MESSAGE` 1:1 text of the message which AI assistant already sent during the conversation. Later messages are later in the conversation. It is bit similar to `EXAMPLE` but it is not example, it is the real message which AI assistant already sent.
-   Add commitment `SCENARIO` A specific situation or context in which the AI assistant should operate. It helps to set the scene for the AI's responses. Later scenarios are more important than earlier scenarios.
-   Add commitment `DELETE` (`CANCEL`, `DISCARD`, `REMOVE`) A commitment (and aliases) to remove or disregard certain information or context.

-   For all these commitments, create standard commitment definition
-   Cross-reference these commitments in the documentation when relevant
-   Look at existing commitment definitions for the reference
-   Keep in mind DRY principle, do not repeat yourself.

---

[x]

[✨🐬] Syntax highlighting in `<BookEditor/>` of commitment `META IMAGE` should work differently:

-   Change all meta commitments definition `MetaImageCommitmentDefinition`, `MetaLinkCommitmentDefinition`,... into single commitment definition `MetaCommitmentDefinition`
-   It should highlight `META IMAGE`, `META LINK`, `META TITLE`, `META DESCRIPTION` as single word commitment
-   It should highlight everything `META UPPERCASE FOO` as single word commitment
-   Look at existing commitment definitions for the reference
-   Keep in mind DRY principle, do not repeat yourself.

---

[x]

[✨🐬] All commitment definitions should work out of the box in both singular and plural

-   For example `MESSAGE` and `MESSAGES` should both work and be highlighted same with `EXAMPLE` and `EXAMPLES`, etc.
-   Keep in mind that some plurals are not just adding `s` at the end, for example `PERSONA` and `PERSONAE`.
-   Make some system for this change, aliases, etc.
-   Look at existing commitment definitions for the reference
-   Reflect this change into the `/CHANGELOG.md`
-   Keep in mind DRY principle, do not repeat yourself.

---

[ ]

[✨🐬] Syntax highlighting in `<BookEditor/>` should work with parameters

-   Parameter is another syntax feature in book language and it should be highlighted too but in different color.
-   There are two types of parameters:
-   ` @Parameter`, ` @ěščřžý` - single word parameter starting with `@`
-   `{parameterName}` or `{parameter with multiple words}` or `{parameterName: description text}`

Here is the example:

```book
AI Assistant

KNOWLEDGE about {topic}
EXAMPLE of @Something
```

-   You are now implementing syntax highlighting not entire parsing logic, implement everything needed for highlighting and keep room with comments for future parsing logic when needed.
-   But reflect this principle into the `/CHANGELOG.md` with note that its in progress and not fully implemented yet.
-   Look at existing highlighting of the first word of the book and highlighting of commitments for the reference
-   Keep in mind DRY principle, do not repeat yourself.

---

[ ]

[✨🐬] Syntax highlighting in `<BookEditor/>` has some false positive highlights

-   Commitments in the middle of the word should not be highlighted
-   It doesnt matter if its uppercase or lowercase, only commitments which are in the beginning of the line are commitments, words with the same name in the middle of the line are not commitments.
-   Update both syntax highlighting and parsing logic to reflect this change
-   Look at existing commitment definitions and highlighting for the reference
-   Reflect this change into the `/CHANGELOG.md`
-   Keep in mind DRY principle, do not repeat yourself.

For example valid commitment `KNOWLEDGE` which should (and is) highlighted:

```book
AI Assistant

KNOWLEDGE Foo
```

For example invalid commitment `KNOWLEDGE` which should NOT be highlighted (but currently it is highlighted):

```book
AI Assistant

Foo bar knowledge baz
```

---

[ ]

!!!!

[✨🐬] Implement the functionality of `DELETE` commitment

-   When user adds `DELETE @Foo` or `DELETE {Foo}` it should invalidate all `@Foo` and `{Foo}` commitments in the book above the `DELETE` commitment.
-   Reflect this change into the `/CHANGELOG.md`
