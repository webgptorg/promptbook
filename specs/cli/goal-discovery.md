# Discovering work from agent goals

[Main specification](../_main.md)

`ptbk start` must remain useful when a project has agents and goals but no task backlog. Only when no unfinished tasks exist, either now or in the future, may it initiate the lowest-priority goal-discovery work. Waiting, paused, blocked and future recurring work are not an empty backlog.

At a controlled interval, ask ordinary project agents whether their goal justifies a new task. Materialize this enquiry as an ordinary task assigned to the agent, then execute, check and commit it through the common lifecycle. It is not a non-task or an unrecorded model call. Hidden/core supporting agents are not ordinary discovery candidates.

An agent may create immediate or future-dated tasks, or conclude that no useful work is needed. Generated tasks are recorded with that enquiry's completion. Once outstanding work exists, service it or wait for its conditions rather than continue inventing work.

After no-work results, wait before asking again. Share the enquiry opportunity fairly across ordinary agents, with at most one active project task. Preserve cooldowns and avoid duplicates across restart so that an empty project cannot cause a tight model-call or commit loop. No model calls are required merely to wait for the next enquiry or a known task's due time.

See [task origins](task-origins.md), [GOAL](../book-language/commitments/goal.md), [eligibility](eligibility.md) and [consistency](../agents/consistency.md).
