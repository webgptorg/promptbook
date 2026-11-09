# Git History page

[Dashboard pages](dashboard-details.md) · [Git persistence](git-persistence.md) · [External activity log](action-log-ui.md)

Provide a compact **History** tile and read-only page over actual project Git history. Show available parent/fork/merge topology and useful branch labels. The terminal defaults to the current branch. Electron adds the branch scope below. Use available local history/refs, explicitly identifying shallow/missing objects. Opening History never fetches/synchronizes, switches branches or rewrites Git.

Focus on **commit messages**, real author/time and graph context; a diff browser is not required. Selected detail retains the full original subject/body and verified source links. Bound long-history rendering and preserve selection/scroll on new commits/resize; narrow terminals keep messages and merge relationships understandable.

For recognized Promptbook formats, presentation may omit `ptbk:` and emphasize the actual agent visual/name. Handle known current/legacy formats defensively; arbitrary user/tool/older commits remain readable verbatim when unrecognized. Never invent an author or discard text to fit a template; original Git messages remain unchanged and inspectable.

Verified Task-Name/Chat-Name/source provenance links lead to task, chat, action or other dashboard detail. Renamed/missing targets are honest historical/unavailable states; subject similarity alone is not identity. Commits use real Git identities, not new Book IDs. This complements runtime Activity and External activity log without model/task/file/external effects on inspection.

## Desktop current changes and branch view

Above the commit graph, show **Current Changes** from the live working tree/index, distinguishing staged, unstaged, untracked and conflicted files and added, modified or deleted paths. Annotate pending desktop commits and task-owned changes only where the engine can verify that origin. Current changes have no commit SHA. Opening a file may show a read-only preview or its status when source is unavailable.

The graph initially shows the current branch and its configured upstream using locally available refs. Show missing upstream or detached HEAD truthfully. Allow the user to add other locally known branches to the graph without switching branches. Keep History read-only, including the current-changes section and commit details. History does not require a Git diff, staging/unstaging, discarding changes or branch checkout. A source-save conflict can still use the separate editor comparison.

## Acceptance outcomes

Browse forks/merges, current agent/system messages, legacy ptbk and ordinary user commits. Preserve real topology/full originals, recognized author formatting and only verified links. Exercise shallow/missing history, renamed targets, arrivals, resize and long logs without mutating Git.

On desktop, exercise current plus upstream, an absent upstream, detached HEAD and adding another locally known branch. Distinguish staged, unstaged, untracked and conflicted paths and verify that browsing performs no Git writes, checkout or fetch.
