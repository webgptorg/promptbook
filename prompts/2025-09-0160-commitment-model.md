[x]

[✨↖️] Enhance `MODEL` commitment to support enforcing any model requirement

All of following notations should work:

```book
MODEL gpt-4
```

```book
MODEL NAME gpt-4
```

```book
MODEL NAME gpt-4
MODEL TEMPERATURE 0.7
```

```book
MODEL NAME gpt-4
MODEL TEMPERATURE 0.7
MODEL TOP_P 2.0
MODEL MAX_TOKENS 2048
```

-   Purpose of the `MODEL` commitment is to enforce the technical parameter for the agent
-   When no `MODEL` commitment is specified, the best model requirement is picked automatically based on the agent `PERSONA`, `KNOWLEDGE`, `TOOLS` and other commitments
-   Reflect this into commitment documentation and description and also `CHANGELOG.md`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨↖️] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨↖️] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨↖️] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`
