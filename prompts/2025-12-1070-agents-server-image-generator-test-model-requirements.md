[x]

[✨🥄] Allow to add additional model requirements like image size in the [Image Generator Test](http://localhost:4440/admin/image-generator-test).

-   Now you can pick only the model and image prompt. Allow to add another parameters for image generation.
-   Look how `LlmExecutionTools` are handling `modelRequirements`
-   It should work for both Single image generation and for the Multiple images generation.
-   When selecting Multiple images, you are putting multiple image prompts but just one set of model requirements (and model) for all images.
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

![alt text](screenshots/2025-12-1070-agents-server-image-generator-test-model-requirements.png)

---

[x]

[✨🥄] Add support for generating images into Google llm tools.

-   Add this on entire vertical from the listing of the models, Google LLM execution tools to the `Agents Server` application `/apps/agents-server` the [Image Generator Test](http://localhost:4440/admin/image-generator-test) and allow to newly added models.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🥄] qux

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🥄] qux

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
