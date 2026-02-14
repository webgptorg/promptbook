[x] ~$0.56 11 minutes by OpenAI Codex `gpt-5.1-codex-mini`

[✨⛳️] Fix and make `USE IMAGE GENERATOR` work:

**For example the agent, should be able to generate images:**

```book
Artist

PERSONA You are an artist.
USE IMAGE GENERATOR Paints photorealistic images.
CLOSED
```

**This agent can create messages like:**

```markdown
Sure, here is your image of the forest in the winter.

![Forest in the winter](?image-prompt=Forest in the winter, photorealistic, high quality, 4k)
```

-   Generation of the images by AI agents should work as follows:
    1. And the agent has a commitment `USE IMAGE GENERATOR` it has extra instruction how to add generated images into the message
    2. The agent itself doestnt call the image generation directly. It just puts a notation `![alt](?image-prompt=...)` into the Markdown, which will trigger the image generation from the user interface.
    3. In the user interface, when we render the message, we check if the message has this notation `![alt](?image-prompt=...)` and if it has, we trigger the image generation with the prompt from the notation. When the image is generated, we replace the notation with the actual image.
    4. Show some nice loading animation while the image is being generated.
-   For the inspiration, look how the quick buttons are parsed and shown `[Hello](?message=Hello, how are you?)`
-   For the inspiration, look how agent profile images are generated
-   Keep in mind the DRY _(don't repeat yourself)_ principle, The queue and lock of the image generation should work in the same way as it is working in other parts of the project.
-   This is a big change. Do a proper analysis of the project before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[ ]

[✨⛳️] Extra instructions in the `USE IMAGE GENERATOR` commitment.

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨⛳️] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨⛳️] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

```

```

