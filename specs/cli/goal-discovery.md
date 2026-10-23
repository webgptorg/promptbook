# Discovering work from agent goals

[Main specification](../_main.md)

`ptbk start` must remain useful when a project has agents and goals but no task backlog. Only when no unfinished tasks exist, either now or in the future, may it initiate the lowest-priority goal-discovery work. Waiting, paused, blocked, unassigned and future recurring work are not an empty backlog.

On startup and after queue completion, automatically evaluate whether discovery is due. When the backlog is empty and no persisted cooldown prevents it, begin an enquiry without requiring the user to add a task, press a control or restart. Ask ordinary project agents whether their goals justify new tasks. Materialize each enquiry as an ordinary task assigned to that agent, then execute, check and commit it through the common lifecycle. It is not a non-task or an unrecorded model call. Hidden/core supporting agents are not ordinary discovery candidates. Fixer's periodic [project-health work](../agents/core-agents/fixer.md) is a separate, bounded maintenance source of **ordinary tasks**, not unrestricted general goal discovery.

An agent may create immediate or future-dated tasks, or conclude that no useful work is needed. Generated tasks are recorded with that enquiry's completion. Once outstanding work exists, service it automatically, arrange missing routing through Router, or wait for its real conditions rather than continue inventing work. Do not require human approval merely to move from discovery to already-authorized task execution.

After no-work results, wait before asking again. Share the enquiry opportunity fairly across ordinary agents, with at most one active project task. Preserve cooldowns and avoid duplicates across restart so that an empty project cannot cause a tight model-call or commit loop. No model calls are required merely to wait for the next enquiry or a known task's due time.

Show discovery as real agent work. When idle, show why and the next enquiry opportunity when known; absence of eligible goal-bearing agents is explicit. Continuous operation does not mean inventing pointless tasks or overriding pause, permissions or safety constraints.

See [task origins](task-origins.md), [GOAL](../book-language/commitments/goal.md), [eligibility](eligibility.md) and [consistency](../agents/consistency.md).
