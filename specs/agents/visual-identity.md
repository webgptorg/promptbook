# Agent visual identity

[Agents](_index.md) · [Project status view](../cli/status-view.md)

Every agent has a recognizable visual identity without requiring the user to choose an image or add visual metadata before work can start. Provide it automatically for ordinary project agents, core agents such as Manager, Teacher and Fixer and the engine-supplied Expert. The default works locally and offline, without an image-generation/model call, external avatar service or extra setup.

## Visual direction: Promptbook Coder badges

Use the Promptbook Coder badge on [AI ta Krajta](https://ai-ta-krajta.cz/) as the visual reference, rather than generic geometric identicons. Its compact terminal-like frame contains an expressive monospace creature: eyes, a body and independently expressive appendages, for example the resting `~<@@/>-` mascot. The desired qualities are character, deliberate spacing, restrained accent colors, a crisp outline and subtle life, not a large picture or a bare emoji beside a name.

The reviewed reference consists of [the badge](https://github.com/webgptorg/ptbk-landing-page-aldaron/blob/6a4e010960d0ec6079b6cf6a1427606df6d33669/components/promptbook-coder/PromptbookCoderBadge.tsx), [its styling](https://github.com/webgptorg/ptbk-landing-page-aldaron/blob/6a4e010960d0ec6079b6cf6a1427606df6d33669/components/promptbook-coder/PromptbookCoderBadge.module.css) and [character poses](https://github.com/webgptorg/ptbk-landing-page-aldaron/blob/6a4e010960d0ec6079b6cf6a1427606df6d33669/components/promptbook-coder/promptbookCoderAnimation.ts). These are design references, not runtime dependencies, a requirement to copy React, or permission to import decorative demo activity as real execution status.

Create a coherent family of small mascot badges with distinct faces/silhouettes or appendages for different agents. Color supports identity but does not carry it alone. The browser can use a dark terminal-like tile, subtle border/glow and restrained movement. The terminal uses well-aligned character cells, semantic colors and a compact frame; it must look intentionally composed rather than like random hash noise. Retain a readable name beside each badge. Do not require exact pixels, seven-character width or the same octopus for every agent.

## Stability and fallbacks

Derive the default consistently from the canonical normalized agent identity, not randomly on each render or from a hash of the entire Book. Equivalent `@`/brace references select the same appearance. The same agent remains recognizable across terminal/browser views, snapshots, sessions and project copies. Moving its source file or editing rules, knowledge or whitespace does not unexpectedly change its face. A genuine identity rename may change the default.

Inheritance does not give every descendant Adam's appearance. Do not introduce a mandatory Book commitment or another readiness step for visual identity. Browser and terminal render the same character family without requiring pixel-identical output. Limited terminals retain a legible text/symbol fallback; raw output uses agent names and textual states without decorative portraits or animation.

## Placement and activity

Show badges in agent/queue views, current-task status, attributed messages and results, including the live dashboard and status snapshot. The [current-work panel](../cli/dashboard-layout.md) makes it immediately clear who is doing what. Agent-authored user-facing chat messages identify the agent speaker, while the human speaker is User rather than another autonomous worker; Void/Null never appears to be doing work.

Identity and observed activity are distinct. Use readable labels and restrained expressions for working, idle, waiting for the user/provider, paused, blocked/failed and completed work. Manager assignment and goal enquiries show their actual responsible agents. A quiet blink is decorative, not proof of progress; work gestures reflect actual work and cannot simulate tool calls, checks or completion. No hardcoded alternating coding/painting scenes may pretend the runtime is performing those actions.

Working motion changes or stops while waiting; snapshots are still frames of the observed state. Respect reduced motion, keep layout stable and do not imply parallel independent tasks. A completed task is not a permanently completed agent. Avatars never obscure details, errors or controls, and chats awaiting human replies remain the highest visual priority. Repainting cannot steal input or change execution, routing or permissions.

## Acceptance outcomes

Compare the current-agent area with the Coder reference: it is an expressive, polished terminal-style mascot badge, not merely a colored initial or random geometric icon. Several agents remain distinguishable without color. Reconnect, move a Book and edit its rules: appearance remains stable. Equivalent references show one identity. Switching from Manager to its selected agent changes the badge, name and actual activity together. Waiting cannot look like active execution; waiting-for-user chats remain more prominent. Raw, narrow and reduced-motion modes preserve names, state and controls.
