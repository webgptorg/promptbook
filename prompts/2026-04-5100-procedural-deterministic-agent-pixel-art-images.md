[x] ~$0.00 35 minutes by GitHub Copilot `gpt-5.4`

[🔧🧩] Procedural deterministic pixel-art agent default images (2-stage pipeline) + still image URL

-   You are working with the [Agents Server](apps/agents-server)
-   Replace default agent avatar generation that currently uses diffusion models with a deterministic procedural pixel-art pipeline
-   The system must be split into 2 explicit stages:
    -   Stage 1: Convert the agent profile / book into intermediate image parameters by calling the language model (LLM). Store the resulting intermediate parameters as structured JSON. These parameters should encode traits such as “kind”, “strict”, etc.
    -   Stage 2: Deterministically generate a pixel-art image (SVG or PNG) from the intermediate parameters using a non-LLM deterministic hashing / rendering algorithm (no randomness). The final pixel-art must be reproducible given the same intermediate parameters.
-   Default avatar behavior:
    -   If an agent has a custom image already, keep using it (only change the default generation logic).
    -   The still image URL must remain supported and must deliver an SVG or PNG dynamically (similar approach as OG images), not a diffusion output.
-   Deterministic requirements:
    -   Given the same agent profile/book content -> same intermediate parameters -> same pixel-art.
    -   Ensure the hashing/rendering step is fully deterministic across environments (same output for the same parameters).
-   Parameter design (placeholders to be finalized in implementation):
    -   Define a compact schema for intermediate parameters (e.g., palette seed, emotion/trait class set, facial-feature toggles, strictness/kindness mapping, background pattern, etc.)
    -   The LLM should only output allowed values matching the schema (validated), not free-form text.
-   Caching / storage (placeholders to be finalized):
    -   Store intermediate parameters in DB so that generation can be re-used and still URLs can be served quickly.
    -   Add a version field for the schema/render algorithm so future changes do not break determinism.
-   API / routing (placeholders to be finalized):
    -   Provide an endpoint to fetch the still image (SVG/PNG) and render it from intermediate parameters.
    -   Ensure it integrates into existing default-avatar UI and metadata (e.g., avatar previews).
-   Testing:
    -   Add deterministic tests: same intermediate params -> identical SVG/PNG bytes.
    -   Add contract tests: LLM stage outputs valid schema (validated) for sample agents (including “kind” and “strict” examples).
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)