# Avatars and Visuals

Every agent has a visual identity used across the UI (directory cards, chat header, manifest icons, social previews). It is resolved from the agent's book with deterministic fallbacks, so an agent **always** has an avatar.

## Resolution order

Given the agent [profile](../agents.md#agent-profile) (from the **resolved** source, so inherited `META` values apply):

1. **`META IMAGE <url>`** (explicit) → the image URL is the avatar (relative URLs resolve against the serving origin). Remote profile payloads mark whether `meta.image` was explicit (`isMetaImageExplicit`) so a generated fallback URL is not mistaken for a user choice.
2. **`META AVATAR` / `META VISUAL <visualId>`** → a **built-in avatar visual**: an animated/canvas-rendered character from the engine's avatar visual registry, identified by a visual id (e.g. `octopus3d4`). Unknown ids are ignored.
3. **Server default visual** — the `DEFAULT_AGENT_AVATAR_VISUAL` [metadata key](../configuration.md#agents); when absent, the engine default (`octopus3d4`).

Interactive UIs render visuals as live canvas characters; static consumers (PNG endpoints, manifests, OG images) rasterize them.

## Per-agent image endpoints

`/agents/:agentName/images` is a public gallery page of the agent's generated assets; each asset is served under `/agents/:agentName/images/<name>`:

| Asset | Content |
| --- | --- |
| `default-avatar.png` | The agent's avatar as PNG (1024×1024). Default mode deterministically rasterizes the resolved avatar visual; `?mode=generated` opts into the legacy **AI-generated** avatar (below). Cache policy `public, max-age=0, must-revalidate`. |
| `icon-256.png` | 256×256 icon: the avatar framed in a gradient capsule (used for PWA/manifest icons). |
| `screenshot-fullhd.png`, `screenshot-phone.png` | Rendered profile screenshots for manifest/social use. |

### AI-generated avatars

In `generated` mode the server builds an image prompt from the agent profile, computes the prompt hash, and:

-   serves the CDN copy when an image for that hash already exists (`prefix_Image`, purpose `AVATAR`; CDN key derived from the hash),
-   otherwise generates it through the image-generation provider under a [generation lock](preparation-and-caching.md#generation-locks) (`lockKey = agent-avatar-<promptHash>`), uploads it to the CDN, records it in `prefix_Image`, and serves it.

Identical prompts therefore share one stored image; changing the agent source changes the prompt hash and triggers regeneration on next request.

## Other visual meta

-   **`META COLOR`** — brand color; drives the agent page theme/gradients and defaults for embeds.
-   **`META FONT`** — font of the agent pages (from the supported application-font set).
-   Profile OG/social images and the [PWA manifest](../ui/embedding-and-pwa.md#manifest) reuse the resolved avatar and color.

Directory cards, the header (see [Navigation](../ui/navigation.md)), chat message avatars, and federated listings all use the same resolution rules, so an agent looks identical everywhere including on [federated](federation.md) servers that only receive its profile payload.
