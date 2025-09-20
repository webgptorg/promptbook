[ ]

[✨🐬] Syntax highlighting in `<BookEditor/>` should highlight more commitments:

-   Add commitment `GOAL`
-   Add commitment `MEMORY`
-   Add commitment `MESSAGE`
-   Add commitment `SCENARIO`
-   Add commitment `DELETE`

---

[ ]

[✨🐬] Syntax highlighting in `<BookEditor/>` of commitment `META IMAGE` should work differently:

-   Change all meta commitments definition `MetaImageCommitmentDefinition`, `MetaLinkCommitmentDefinition`,... into single commitment definition `MetaCommitmentDefinition`
-   It should highlight `META IMAGE`, `META LINK`, `META TITLE`, `META DESCRIPTION` as single word commitment
-   It should highlight everything `META UPPERCASE FOO` as single word commitment

---

[ ]

[✨🐬] All commitment definitions should work out of the box in both singular and plural

-   For example `KNOWLEDGE` and `KNOWLEDGES` should both work and be highlighted same with `EXAMPLE` and `EXAMPLES`, etc.
-   Keep in mind that some plurals are not just adding `s` at the end, for example `PERSONA` and `PERSONAE`.
-   Make some system for this change, aliases, etc.
-   Keep in mind DRY principle, do not repeat yourself.

---

[ ]

[✨🐬] Syntax highlighting in `<BookEditor/>` should work with parameters

---

[ ]

[✨🐬] Syntax highlighting in `<BookEditor/>` has some false positive highlights
