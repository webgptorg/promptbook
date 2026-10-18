# GOAL

[Commitments](_index.md) · [Syntax](../syntax.md)

**Document:** Agent or task.

Alias: `GOALS`. Contains the intended objective as natural-language content, on one or several lines.

For an **agent**, this is a lasting objective, including when no task is assigned. It informs execution, Manager selection and [goal discovery](../../cli/goal-discovery.md). A goal does not itself authorize arbitrary actions or require manufacturing work.

For a **task**, it describes the bounded work and intended result of that task, including its descriptive continuation text. This lets the assignment use the same commitment-only syntax as other Book content, without overloading the TASK name declaration or creating an unowned prose section. It is not a persistent agent goal, an independent recurring agenda or a new goal-discovery source. Existing task scheduling, checks and completion remain authoritative.
