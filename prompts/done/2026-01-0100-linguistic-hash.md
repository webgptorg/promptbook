[x]

[✨💁] Create utility function `linguisticHash` which will create human-readable hash

```typescript
await linguisticHash(''); // returns something like 'Red apple jumping fox'
await linguisticHash('Hello, world!'); // returns something like 'Blue sky dancing cat'
await linguisticHash('Promptbook is awesome!'); // returns something like 'Green tree flying bird'
```

-   The `linguisticHash` function should take a string input and return a human-readable hash composed of three random words (adjective, noun, verb).
-   The words should be selected from predefined lists of adjectives, nouns, and verbs.
-   First word will be capitalized other words will be in lowercase, no dots or commas are needed.
-   Capitalize dynamically in the list of prefined words do not create separate list with capitalized words.
-   The function itself `linguisticHash` should be exported from `@promptbook/utils` package. _(To accieve that just add "@public exported from `@promptbook/utils`" to jsdoc of the function)_
-   Add it as a utility into the `Utils app` application `/apps/utils` as `http://localhost:4024/linguistic-hash`
-   The input there should be persisted in query parameter `input`, e.g., `http://localhost:4024/linguistic-hash?input=Hello%20world`
-   Default input should be "Promptbook is awesome!" and the hash should be show immediately on page load.
-   Look how the other utilities are done, for example `http://localhost:4024/humanize`, this utility should look and feel similar.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨💁] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨💁] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨💁] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
