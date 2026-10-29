# Git History page

[Dashboard pages](dashboard-details.md) · [Git persistence](git-persistence.md) · [Action log](action-log-ui.md)

Provide a compact **History** tile and read-only page over actual project Git history. Default to the current branch, showing available parent/fork/merge topology and useful branch labels. Use available local history/refs, explicitly identifying shallow/missing objects. Opening History never fetches/synchronizes, switches branches or rewrites Git.

Focus on **commit messages**, real author/time and graph context; a diff browser is not required. Selected detail retains the full original subject/body and verified source links. Bound long-history rendering and preserve selection/scroll on new commits/resize; narrow terminals keep messages and merge relationships understandable.

For recognized Promptbook formats, presentation may omit `ptbk:` and emphasize the actual agent visual/name. Handle known current/legacy formats defensively; arbitrary user/tool/older commits remain readable verbatim when unrecognized. Never invent an author or discard text to fit a template; original Git messages remain unchanged and inspectable.

Verified Task-Name/Chat-Name/source provenance links lead to task, chat, action or other dashboard detail. Renamed/missing targets are honest historical/unavailable states; subject similarity alone is not identity. Commits use real Git identities, not new Book IDs. This complements runtime Activity and external Action log without model/task/file/external effects on inspection.

## Acceptance outcomes

Browse forks/merges, current agent/system messages, legacy PTBK and ordinary user commits. Preserve real topology/full originals, recognized author formatting and only verified links. Exercise shallow/missing history, renamed targets, arrivals, resize and long logs without mutating Git.
