[x] ~$0.9109 an hour by OpenAI Codex `gpt-5.4`

[🎭🖼️] Materialize `META IMAGE` during self-learning (fix avatar appearance, long-running learning, derive colors)

-   Problem: during self-learning the agent avatar (`META IMAGE`) can be regenerated/changed as the persona/source changes.This makes the agent appearance unstable (Agent can have suddenly different visual appearance)
-   Goal: when self-learning generates an avatar (`META IMAGE`), materialise (self-learn) the resulting image URL into the agent **source** so that the avatar becomes fixed until the user explicitly edits the source.

-   This is NOT:

    -   a caching replacement; keep all existing caching exactly as-is.
    -   a replacement of default images when image is missing.
    -   a behaviour change for closed agents (if agent is closed and has no meta-image, keep current default-image behaviour; do not materialise meta-image while closed).

-   Behaviour (opened agent + self-learning enabled):

    -   Self-learning may update the book/source progressively (partial learnings should appear in the book as soon as available).
    -   Image generation may take long (1–5+ minutes). The self-learning mechanism must not fail just because the image generation takes minutes.
    -   The system should be able to create/return a URL placeholder/handle early, then later materialise the final URL into the source once the image generation is completed.
    -   After the image is generated, update the book/source once again to include:
        -   the final meta-image URL (materialised into source)
        -   derived colors (2–3) stored in source metadata in a stable way

-   History / snapshots:

    -   During one self-learning run, create **exactly one** history snapshot (even if we save progressively during the run).
    -   The history snapshot should be named only when the self-learning is done.
    -   The finished self-learning snapshot name must be: `self-learning`.

-   Acceptance criteria:

    -   If self-learning updates persona/source multiple times, avatar image shown for the agent does not keep changing as a side-effect; once materialised, the image is stable and stored in the agent source.
    -   Self-learning does not timeout/fail for long image generation (minutes); it completes successfully and materialises the image when ready.
    -   Book/source shows incremental changes while learning is running, then a final update when `META IMAGE` are ready.
    -   Agent history shows a single snapshot for the whole run, named `self-learning`.
    -   Closed agents keep current behaviour (default image remains; no retroactive materialisation while closed).
    -   Colors are derived only once on materialisation, and persist in source; they do not change unless user explicitly changes the materialised image in source.

-   Implementation notes

    -   By materializing to source, I mean explicitly adding commitment `META IMAGE <url>` into the agent source book, so that the image URL becomes part of the agent's definition and is stable until the user explicitly changes it.
    -   By “allow the creation of the URL” I mean the mechanism similar, for example, to YouTube IDs: the ID and the URL of the file on the CDN can be known before the content of the file exists itself. So you can use this URL in the agent source while the image is still being generated.

-   You are working with:

    -   [Agents Server](apps/agents-server)
    -   Self-learning mechanism
    -   Image generation
    -   CDN
    -   Agent source in <BookEditor>
    -   Agent history persistence

-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[]

[🎭🖼️] @@@

-   Also derive agent theme colors from the materialised image (2–3 colors) **only** at the moment of image materialisation.

-   Colors derivation:

    -   Derive 2 or 3 colors from the newly materialised image using an imported mechanism from WebGPT @@@.
    -   Do this only when the image is being materialised (do not re-derive colors on every persona/source change).
    -   Put the files and utilities which extract colors from images into the natural place in Promptbook src (shared utility, not app-specific) @@@.
    -   @@@ Define where the colors live in agent source (metadata keys) and how consumers (UI) use them.

-   History / snapshots:

    -   During one self-learning run, create **exactly one** history snapshot (even if we save progressively during the run).
    -   The history snapshot should be named only when the self-learning is done.
    -   The finished self-learning snapshot name must be: `self-learning`.

    -   @@@ Confirm which WebGPT mechanism to import for extracting colors (package name / source file / license constraints).
    -   @@@ Decide whether to store colors as hex strings, CSS variables, or structured object; and whether 2 vs 3 is deterministic.

