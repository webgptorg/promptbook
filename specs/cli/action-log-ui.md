# External activity log page

[External-action records](action-log.md) · [Impact and priority](../concepts/external-action-impact.md) · [Dashboard pages](dashboard-details.md) · [History](history.md)

Provide an **External activity log** tile and terminal/browser page over the saved records, separate from System logs, task results, harness sessions, traces and Git History. Rows show time, agent, operation/target, observed outcome, linked task and impact. A group shows count/aggregate outcome without claiming all members succeeded. An action detail exposes content, rationale, methodology provenance, technical attempts and verified task/harness/evidence/safe receipt links, also reachable from task detail. Failed tasks can have successful actions; partial and uncertain outcomes remain explicit.

## Views and navigation

| View | Top level | Enter / next level |
| --- | --- | --- |
| Default | Mixed agents/tasks; actions and collapsed inherent batches. | Batch's action list or individual action detail. |
| Fully ungrouped | Every individual logical action, ignoring batches for presentation. | Action detail with technical attempts. |
| By task | Task summaries. | Relevant batches/actions, then member/detail. |
| By agent | Executing-agent summaries. | That agent's tasks, then batches/actions and details. |

Batch IDs remain stored while ungrouped. Batches never contain batches: their own relationship is only batch -> actions. Agent/task navigation can add levels. A task under an agent contains **only that executor's own actions**, avoiding recounting another agent's work. Operations without a task retain an honest no-task/system-operation branch; invent no source task. Back/Escape returns one level preserving selection/scroll.

## Filtering and sorting

The default cutoff is **impact >= 1**, applied to the displayed action or **aggregate group**, never by discarding members first. Ten impact-0 actions form a visible impact-1 group. **Show all** removes the impact cutoff and is independent of the grouping selector. Opening a visible group permits inspection of every member, including those below the top-level cutoff.

Unknown impact is distinct from zero and stays visible by default. Mixed groups expose the known subtotal plus unknown count/incompleteness; all-unknown groups have no invented numeric total. Outcome filters concern individual actions, not task results. If a filter selects only some members, aggregate that subset and identify its total as filtered. No group/child pair is counted twice.

Offer sorting by **time**, **impact**, and **smart (impact and age)**, initially smart. Use the [30-days-per-point formula](../concepts/external-action-impact.md#priority-and-aging). Saved impact does not decay; cutoff uses impact, never current priority. For chronological ordering use a group's latest member time, visibly a group time. Smart priority ages **each member before summing**; a new minor action cannot renew an agent/task's entire history. Equal-age failed/successful variants of the same impact tie. Unknown scores retain an explicitly labelled visible position, not a fabricated numeric rank. Use stable tie-breaking/selection.

## Shared read-only behavior

Use bounded engine-owned readers/calculations and rebuildable ignored `.ptbk/` caches. Preserve current grouping/filter/sort and navigation during arrivals/resize. Long histories never fill the home tile. Empty prospective history cannot prove no earlier external work occurred. Clients share saved/pending-commit state. Inspection never backfills history, retries an operation, calls a provider/model or creates commits; no second action store, scheduler or approval queue is introduced. Redact secrets before storage/display. Important completed history alone does not request human attention.

## Acceptance outcomes

Show a 1,000-email batch as one important default row, then all 1,000 separate records/outcomes on Enter. Exercise every view, a multi-executor task and no-task operation without double counting. Batch nesting is impossible. Unknown and mixed groups remain visible/incomplete.

Ten grouped impact-0 actions pass cutoff at impact 1 and all members remain inspectable. Ungrouping alone hides subthreshold rows until Show all; source data stays unchanged. Filter failed actions and show a truthful filtered subtotal. Verify all sort modes, 30-day ties, outcome-independent priority and no group rejuvenation by a fresh minor action. Rebuild cache and preserve totals, source records, navigation/selection and honest unavailable evidence. No inspection mutates source or external state.
