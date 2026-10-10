# Expert

[Agents](_index.md) · [Non-agents](non-agents.md)

Expert understands Promptbook, Book syntax, agents, tasks, project operation and the capabilities of the engine currently running it. Its knowledge must match that engine version and effective runtime context, not a stale project copy or an unrelated global installation.

Expert is never materialized into `agents/.core/`. Updating or selecting another engine may change Expert while preserving the project's own definitions. The engine must make the relevant introspective context available without requiring the user to maintain or copy it into every project. Do not expose credentials as introspection.

Expert is usable both through `FROM Expert` and `TEAM ... @Expert`. A project can define `Modified Expert` with `FROM Expert` and let Teacher inherit that local specialization. A programmer can consult Expert without any Expert file existing in the project.

[Initialization](../cli/initialization.md) explicitly assigns the first project-creation task to Expert. [Teacher](teacher.md) inherits Expert by default. Expert's internal implementation may use Book and shared agent mechanisms, but those are not project-owned source or requirements on its implementation.
