[x]

[✨🈶] Add `fullname` to `AgentBasicInformation`

-   This fullname can be used to represent the agent's full name in the UI
-   In lot of the places we are using `agentName` which is normalized first line of the agent source, use `meta.fullname` instead
-   Keep using `agentName` as a identifier
-   Keep using `agentName` as fallback if `meta.fullname` is not provided
-   This can be overrided by `META FULLNAME` commitment _(like any `META XXX` commitment)_
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

**For example:**

```book
Pavol Hejný

PERSONA Developer with 10 years of experience in building AI applications.
```

-> Will result in agent having `agentName` to `pavol-hejny` and `meta.fullname` set to `Pavol Hejný`.

```book
Pavol Hejný

PERSONA Developer with 10 years of experience in building AI applications.
META FULLNAME Dr. Ing. Pavol Hejný, PhD.
```

-> Will result in agent having `agentName` to `pavol-hejny` and `meta.fullname` set to `Dr. Ing. Pavol Hejný, PhD.`.

---

[ ]

[✨🈶] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[ ]

[✨🈶] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[ ]

[✨🈶] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
