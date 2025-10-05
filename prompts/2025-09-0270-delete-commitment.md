[ ]

[✨🐢] Implement the functionality of `DELETE` commitment

-   When user adds `DELETE @Foo` or `DELETE {Foo}` it should invalidate all `@Foo` and `{Foo}` commitments in the book above the `DELETE` commitment.
-   Reflect this change into the `/CHANGELOG.md`

For example:

```book
AI agent

KNOWLEDGE @Example https://example.com
PERSONA Friendly assistant
DELETE @Example

```

Is equivalent to:`

```book
AI agent

PERSONA Friendly assistant

```

---

[ ]

[✨🐢] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨🐢] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨🐢] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`
