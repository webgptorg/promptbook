[ ]

[✨🦊] Replace existing avatars with origami animals in Coder and Agents Server

Replace the current default avatars in `ptbk coder` and `apps/agents-server` with one cohesive origami animal family, using the existing shared `src/avatars` system.

-   Include fox, cat, dog, rabbit, whale and an octopus with eight tentacles. Reuse the existing agent identity/seed and colors for deterministic species and print variations across web, terminal and reloads.
-   Each animal folds from one continuous, uncut, preprinted A4 sheet into a complete volumetric 3D body. Use genuine, physically valid folds, preserve paper continuity and print alignment, and provide printable patterns.
-   Animate assembly and unfolding; expose scrubbing and rotation in the existing avatar playground.
-   While working, the animal folds a separate sheet using articulated 3D paws, fins or tentacles synchronized with the paper. Drive idle, working, paused and completed states from actual Coder/Agents Server lifecycle events; checkmarks reflect real task completion.
-   Replace existing default avatar usages in both products, including shipped legacy defaults. Preserve explicit custom images and visual selections. Reuse shared identity, fold and state logic for web 3D, multi-line terminal ASCII, single-line ASCII and static PNG previews.
-   Keep terminal output responsive to resizing, usable without browser/WebGL dependencies, and compatible with plain/non-TTY output. Respect reduced motion and avoid animating off-screen avatars.

Acceptance: existing Coder and Agents Server surfaces use origami by default; identity matches across formats, animals have visible volume from multiple angles, and limbs remain in contact with the folding paper.

Context: `src/utils/agents/terminalAgentAvatarVisual.ts`, `scripts/run-codex-prompts/ui/buildCoderRunAgentVisual.ts`, `apps/agents-server/src/components/AgentAvatar/AgentAvatar.tsx`, `specs/agents/avatars-and-visuals.md`.

-   Keep the implementation DRY, update relevant documentation and the changelog, and verify both integrations.
