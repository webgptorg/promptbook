# Listing agent projects walks every project tree, only to compute a size nobody shows in chat

While fixing the project chip appearing only after a page reload
([`prompts/2026-08-0380-agents-server-project-referencing.md`](../prompts/2026-08-0380-agents-server-project-referencing.md)),
the cost of `listAgentProjectChatReferences` turned out to be the constraint shaping the whole fix.

## Why it is expensive

[`listAgentProjects`](../apps/agents-server/src/utils/agentProjects/listAgentProjects.ts) builds one
`AgentProjectInfo` per project through
[`createAgentProjectInfo`](../apps/agents-server/src/utils/agentProjects/resolveAgentProjectInfo.ts), which calls
[`measureDirectoryUsage`](../apps/agents-server/src/utils/agentProjects/measureDirectoryUsage.ts) - an **unbounded
recursive walk** of the project folder that `stat`s every single file. Nothing excludes `node_modules`, `.next`, or
`dist`, so one npm-based project of an agent turns a project listing into tens of thousands of `stat` calls.

This walk runs on every render of the agent profile page and of the chat page, because both resolve the project
references the chat needs to render project mentions as chips.

The measured fields (`sizeBytes`, `fileCount`, `latestModifiedAt`) are **not used by the chat at all** -
`AgentProjectMarkdownReferenceInfo` picks only `projectName`, `displayName`, `description`,
`faviconRelativePath`, `isRunning` and `projectUrl`. The size is shown only by `<AgentProjectItem/>` in the projects
list and on the project detail page.

## What was done for now

Nothing about the walk itself - it is outside the scope of the chip task. The new
`$refreshAgentProjectChatReferencesAction` avoids **paying** for it instead: it first lists the project directory
names with the new cheap
[`listAgentProjectNames`](../apps/agents-server/src/utils/agentProjects/listAgentProjectNames.ts) and rebuilds the
references only when the set of projects really changed compared to what the open chat already renders.

## Suggested next step

Give `createAgentProjectInfo` an option to skip `measureDirectoryUsage` (or split the usage measurement into its own
`resolveAgentProjectUsage` used only where the size is displayed), and let the chat/profile reference listing use the
cheap variant. Independently, `measureDirectoryUsage` should skip `node_modules`, `.next` and other build outputs, or
stop early after a file-count budget, so a single npm project cannot make an agent page slow.
