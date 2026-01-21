[x] $0.73

[✨🚢] Report entire line when generate-packages script fails on "[🟢]",... error

-  When the script fails, show error such as:

**Instead of this:**

```bash
$ npx ts-node ./scripts/generate-packages/generate-packages.ts

...

✅ Package @promptbook/wizard built successfully
✅✅ All packages built successfully
5️⃣  Postprocess the generated bundle
6️⃣  Test that nothing what should not be published is published
Error in generate-packages.ts
Error: Things marked with [🟢] should never be never released in packag

But found in package `@promptbook/browser`

Analyze the issue in the bundle file:
./packages/browser/esm/index.es.js
<- Search for [🟢] marker
    at generatePackages (C:\Users\me\work\ai\promptbook\scripts\generate-packages\generate-packages.ts:632:27)    
```


**Show this:**

```bash
$ npx ts-node ./scripts/generate-packages/generate-packages.ts

...

✅ Package @promptbook/wizard built successfully
✅✅ All packages built successfully
5️⃣  Postprocess the generated bundle
6️⃣  Test that nothing what should not be published is published
Error in generate-packages.ts
Error: Things marked with [🟢] should never be never released in packag

But found in package `@promptbook/browser`

Analyze the issue in the bundle file:
./packages/browser/esm/index.es.js
<- Search for [🟢] marker

In line 1234:
// Note: [🟢] This file containing private code blah foo bar xxxx

    at generatePackages (C:\Users\me\work\ai\promptbook\scripts\generate-packages\generate-packages.ts:632:27)    
```


-   Relevant script is scripts/generate-packages/generate-packages.ts
-   This is relevant for all "[🟢]", "[⚪]", "[⚫]", "[🟡]", "[🔵]"
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🚢] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🚢] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🚢] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

