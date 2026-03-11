[🎭🖼️]

[🎭🖼️] Materialise META IMAGE during self-learning (fix avatar appearance, long-running learning, derive colors)

-   *(@@@@ Written by agent)*
-   Problem: during self-learning the agent avatar (META IMAGE) is effectively regenerated/changed as the persona/source changes. This makes the agent appearance unstable and causes unnecessary hits on default avatar images.
-   Goal: when self-learning generates an avatar (META IMAGE), materialise (persist) the resulting image URL into the agent **source** so that the avatar becomes fixed until the user explicitly edits the source.
-   Also derive agent theme colors from the materialised image (2–3 colors) **only** at the moment of image materialisation.
-   This is NOT:
    -   a caching replacement; keep all existing caching exactly as-is.
    -   a replacement of default images when image is missing.
    -   a behaviour change for closed agents (if agent is closed and has no meta-image, keep current default-image behaviour; do not materialise meta-image while closed).

-   Behaviour (opened agent + self-learning enabled):
    -   Self-learning may update the book/source progressively (partial learnings should appear in the book as soon as available).
    -   Meta-image generation may take long (1–5+ minutes). The self-learning mechanism must not fail just because the image generation takes minutes.
    -   The system should be able to create/return a URL placeholder/handle early, then later materialise the final URL into the source once the image generation is completed.
    -   After the image is generated, update the book/source once again to include:
        -   the final meta-image URL (materialised into source)
        -   derived colors (2–3) stored in source metadata in a stable way

-   Colors derivation:
    -   Derive 2 or 3 colors from the newly materialised image using an imported mechanism from WebGPT @@@.
    -   Do this only when the image is being materialised (do not re-derive colors on every persona/source change).
    -   Put the files and utilities which extract colors from images into the natural place in Promptbook src (shared utility, not app-specific) @@@.
    -   @@@ Define where the colors live in agent source (metadata keys) and how consumers (UI) use them.

-   History / snapshots:
    -   During one self-learning run, create **exactly one** history snapshot (even if we save progressively during the run).
    -   The history snapshot should be named only when the self-learning is done.
    -   The finished self-learning snapshot name must be: `self-learning`.

-   Acceptance criteria:
    -   If self-learning updates persona/source multiple times, avatar image shown for the agent does not keep changing as a side-effect; once materialised, the image is stable and stored in the agent source.
    -   Self-learning does not timeout/fail for long image generation (minutes); it completes successfully and materialises the image when ready.
    -   Book/source shows incremental changes while learning is running, then a final update when image URL + colors are ready.
    -   Agent history shows a single snapshot for the whole run, named `self-learning`.
    -   Closed agents keep current behaviour (default image remains; no retroactive materialisation while closed).
    -   Colors are derived only once on materialisation, and persist in source; they do not change unless user explicitly changes the materialised image in source.

-   Implementation notes / constraints (@@@ to confirm details):
    -   @@@ Define what “materialise to source” means in Promptbook notation (which metadata key / syntax; where in the book it should be written).
    -   @@@ Define the exact contract for “allow the creation of the URL” while generation is pending (temporary URL vs job-id URL vs empty + later patch).
    -   @@@ Define how progressive saves interact with editor autosave and merge/conflict resolution if user edits while self-learning is running.
    -   @@@ Confirm which WebGPT mechanism to import for extracting colors (package name / source file / license constraints).
    -   @@@ Decide whether to store colors as hex strings, CSS variables, or structured object; and whether 2 vs 3 is deterministic.

-   You are working with:
    -   [Agents Server](apps/agents-server)
    -   Self-learning pipeline / flows: @@@ (locate exact files)
    -   Image generation / meta image handling: @@@ (locate exact files)
    -   Agent source persistence: @@@ (locate exact files)
    -   Agent history persistence/naming: @@@ (locate exact files)
    -   Color extraction utilities (new shared src utils): @@@

-   Add the changes into the [changelog](changelog/_current-preversion.md)
