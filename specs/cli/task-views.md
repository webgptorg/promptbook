# Complete task inventory and useful default views

[Dashboard layout](dashboard-layout.md) · [Eligibility and execution order](eligibility.md) · [Tasker](../agents/core-agents/tasker.md)

The Tasks panel can browse **all** project tasks: running, ready, blocked, waiting, scheduled, recurring, completed and historical. Use a bounded scrollable list, with circular keyboard navigation from the last item to the first and back. Filtering, pagination or compact rendering cannot make distant/completed tasks inaccessible. Show status, responsible agent, meaningful timing, recurrence, effective priority and actionable blockers, with full source/detail access.

Include [system tasks](system-tasks.md) in the same inventory/details with a kind label and actual executor. Distinguish a task definition from its occurrences/runs; offer source actions only where a project source exists. A core agent's task is ordinary work, with descriptive core provenance rather than a third execution kind. Show independent effective CONTENT/SYSTEM/undefined purpose where available.

Offer ordinary user-selected sorting and filtering by the available fields, including direction. Preserve each viewer's current selection and presentation while data refreshes. These choices are a view over the engine's complete inventory; they do not change task priorities, scheduling, persisted definitions or execution order.

## Smart default order

The first view should help the user make decisions about current work:

1. Running work and work ready now, keeping significant actionable blockers/waits visible.
2. Work coming up soon, with nearer execution opportunities ahead of more distant ones.
3. Recently completed work, useful for immediate review.
4. Distant future work, then old completed history, with deeply historical tasks least prominent.

Within comparable urgency/time groups, recurring work is more prominent than a one-off. Consider effective priority and important user decisions without letting a far-future task's rank hide today's work. Keep ordering understandable and stable rather than continuously shuffling similar items. Exact time buckets/ranking weights are presentation choices, not a second scheduler or a requirement to call a model to sort a list.

The main authoring conversation action is **Talk to Tasker**, using the normal selected-agent chat and shared composer. Explicit finite task creation remains available. Opening the panel or changing sort order creates no work, commits or inference calls. Creating a task during pause saves it normally and leaves it pending.

Acceptance includes a mixture of active, blocked, tomorrow's, far-future, recurring, freshly completed and months-old tasks. The default emphasizes current decisions, all tasks remain reachable, alternate sorting is available and the engine executes exactly the same eligible work regardless of the viewer's order.

## Content prominence and muted system work

Apply [project-relative purpose](../concepts/minimal-interruption/work-purpose.md) before ordinary smart ordering: emphasize content tasks regardless of whether their executor is core. System-purpose tasks, including engine-owned maintenance and noncore-agent technical work, are visually muted/greyed and placed in a lower or collapsed supporting-work group by default. Provide an obvious show-system-work/filter action and retain complete detail/history. Unclassified tasks remain in the ordinary accessible view; opening a list must not classify them by inference.

Purpose controls presentation only, never effective execution priority, eligibility or prerequisite order. A genuine human request remains conspicuous even on muted system work. Read-only inventory sorting/filtering appends no purpose commitment. Reclassification refreshes the view using the last valid commitment while preserving selection and source history.
