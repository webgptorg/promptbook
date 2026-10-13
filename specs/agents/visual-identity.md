# Agent visual identity

[Agents](_index.md) · [Project status view](../cli/status-view.md)

Every agent has a recognizable visual identity without requiring the user to choose an image or add visual metadata before work can start. Provide it automatically for ordinary project agents, core agents such as Manager/Teacher and the engine-supplied Expert. The default works locally and offline, without an image-generation/model call, external avatar service or extra setup.

## Default appearance and stability

The initial design is a small distinctive geometric or character-like avatar, with a recognizable shape/pattern and accent color, accompanied by the agent's name. Derive the default consistently from the agent's canonical normalized identity, rather than randomly on each render or from a hash of the entire Book. The same agent remains recognizable across terminal/browser views, snapshots, sessions and project copies. Moving its source file or editing rules, knowledge or whitespace does not unexpectedly change its face. A genuine identity rename may change the default.

Different agents in a project are distinguishable by more than color alone; always retain a readable name. Inheritance does not give every descendant Adam's appearance. Do not introduce a mandatory Book commitment or another readiness step just to obtain a usable avatar. Exact artwork and rendering technique remain design choices.

The browser shows a lightweight graphic; the terminal uses a recognizable compact symbol, block/ASCII portrait or equivalent representation suited to its capabilities. They express the same identity without needing pixel-identical artwork. Limited terminals retain a text/symbol fallback; raw output uses the agent name and textual state without decorative portraits or animation.

## Placement and activity

Show identity alongside agents in agent/queue views, current-task status, attributed messages and results, including the live dashboard and status snapshot. A prominent current-agent area makes it immediately clear who is working on what. User requests identify the human as User rather than another autonomous worker; Void/Null never appears to be doing work.

Keep identity separate from observed activity: distinguish working, idle, waiting for the user/provider, paused, blocked/failed and completed work with readable labels and appropriate indicators. Manager assignment and goal enquiries show their actual responsible agents. Any animation follows real activity, stops or changes when work waits, respects reduced-motion needs and does not imply fabricated progress or parallel independent tasks. A completed task is not a permanently completed agent.

Avatars help orientation; they never obscure task details, errors or controls. Pending user requests remain the highest-priority visual content. Resizing, repainting or loading artwork cannot steal input, start a task or change execution state; appearance must not affect routing, permissions or agent behavior.

## Acceptance outcomes

Initialize several agents without visual configuration and observe recognizable identities in terminal, browser and a status snapshot. Reconnect, move a Book and edit its rules: identity remains stable. Switch active work from Manager to its selected agent: the portrait, name and actual activity change together. Waiting does not look like ongoing execution; pending requests remain more prominent than avatars. Raw, narrow and reduced-motion presentations preserve names, state and controls without requiring graphics.
