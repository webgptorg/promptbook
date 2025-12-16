[x]

[✨✯] Book language should parse `agentName` from first non-empty line

**All of theese are "Joe Doe" agent:**

```book
John Doe

PERSONA You are a helpful assistant.
```

or:

```book


John Doe

PERSONA You are a helpful assistant.
```

or:

```book

---

John Doe

PERSONA You are a helpful assistant.
```

**But not:**

```book
x

John Doe

PERSONA You are a helpful assistant.
```

Its "x" agent and "John Doe" is ignored because its not the name nor some commitment

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨✯] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨✯] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨✯] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
