[x]

[✨🏭] Create `/api/images` route

-   Allow to GET `/images/cat-sitting-on-keyboard.png` to get image file
-   The "cat-sitting-on-keyboard.png" should be normalized to "Cat sitting on keyboard" prompt
    -   Create normalization function in `/src/utils/normalization`
-   Use `callImageGenerationModel` to generate image if not exists
-   Upload generated image to CDN
-   Store (cache) generated images in table `Image`
    -   Migrations are located in `/apps/agents-server/src/database/migrations`
    -   Be aware that table names in migrations have prefix `prefix_` _(look at existing migrations for reference)_
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🏭] baz

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🏭] baz

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🏭] baz

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
