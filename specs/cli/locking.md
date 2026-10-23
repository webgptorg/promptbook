# Project ownership and lock cleanup

[Main specification](../_main.md) · [Workspace](workspace.md) · [Service lifecycle](service-lifecycle.md) · [Recovery](recovery.md)

A project directory has at most one active Promptbook engine owner, regardless of package version, global/local installation, launcher or how its path was spelled. Concurrent starts, path aliases and competing foreground/daemon starts must not create two task-mutating engines for that project. Resolve the actual project boundary consistently; the installed package directory is not the lock scope. Related worktrees/nested projects still coordinate shared Git mutations under recovery rules.

Acquire and verify exclusive ownership before scheduling or mutating work. Existing runtime metadata, a PID or an old timestamp alone is not proof of a live owner. Do not target a reused PID or another project's process. Report the known owner or uncertainty rather than forcibly taking over a live project. The lock protects the engine, not a terminal window.

A project engine may have zero, one or many dashboard/API clients. Attaching, closing, reconnecting or switching clients never acquires the engine lock, releases it or transfers ownership. A global discovery registration is also not a project lock and does not grant execution authority. Local control remains possible when the optional browser HTTP server is disabled.

## Owner-only cleanup

The service/process that created a lock is responsible for releasing/removing its own lock during controlled shutdown whenever possible. This includes ordinary stop, restart's shutdown phase, catchable graceful termination and an internal force-stop operation handled by that service. A CLI or dashboard asks the owner to stop; it must not unlink the owner's lock as a shortcut to termination.

Do not release ownership while an old owned worker can still mutate the project, or remove a successor's lock while finishing cleanup. Cleanup is scoped, bounded and truthful: report failure or uncertainty rather than deleting arbitrary `.ptbk/` content. Preserve recovery records, traces, browser sessions and unrelated locks. The engine remains the owner in `pausing`, `pause` and `stopping` until actual release.

An external uncatchable kill may leave a lock record uncleaned because the owner cannot run cleanup. Do not promise a cleanup callback, require a new automatic next-start deletion mechanism for this case, or let an unrelated viewer delete that lock. Distinguishing stale discovery records from live services is a separate [global-dashboard](global-dashboard.md) responsibility, not permission to remove project locks. Existing safe recovery must continue to verify ownership rather than treating a leftover record or reused PID as a live service.

## Acceptance outcomes

Simultaneously start the same project from different installations and equivalent paths: exactly one engine owns it. Attach three dashboards and then close all of them: ownership and work continue. A paused engine still excludes a second owner. Ordinary and internally forced shutdown attempt owned lock cleanup without deleting persistent data; restart cannot overlap owners. Simulate cleanup failure, a reused PID and a replacement owner. An external hard kill has no cleanup guarantee, and a global viewer never releases a project lock.
