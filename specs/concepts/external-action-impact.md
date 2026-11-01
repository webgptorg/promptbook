# External-action impact, aggregation and priority

[External activity log](../cli/action-log.md) · [Log page](../cli/action-log-ui.md) · [Common knowledge](common-knowledge.md)

## Meaning and evaluator

Impact estimates the contextual consequence **if a logical external action succeeds**. It is neither success probability nor technical effort, monetary value alone or moral approval. A failed payment attempt retains the impact of the intended payment; outcome is separate. A routine email and an email creating a major obligation need not have similar impact because both send email.

The **executing agent** estimates impact from content, recipient, scale, reversibility and possible consequences using its effective inherited methodology. Do not dispatch every estimate to Adam or a scoring agent. The engine deterministically calculates summaries, cutoffs and ordering. Future use in confirmation policy is possible, but this specification adds no new per-action approval requirement.

Recommended guidance is the first [common-knowledge Book](common-knowledge.md): `https://ptbk.io/book/external-action-impact.book`. Adam supplies the knowledge and an instruction to apply it when evaluating external actions. Expert and Teacher inherit it through the project-specific chain. Default reference examples are shared across projects; users can deliberately replace, pin, inline or customize the methodology. Prefer a consistent scale within a project; retain divergent methodology in provenance rather than pretending incompatible baselines are identical.

## Decimal logarithmic scale

For a known numeric impact `I`, its linear weight is:

```text
w = 10^I
```

One additional point means ten times the weight. An order of magnitude is an ordinary decimal order; this is the reason to prefer base 10 over the natural logarithm. Changing base would be a change of units requiring consistent conversion of baseline, cutoff and aging, not an improvement to aggregation by itself.

Zero is the lowest reference level for captured impacts and has weight **1**, not zero weight. The recommended scale uses finite nonnegative numbers, including fractional estimates. **6 is not a maximum**. Do not clamp consequential operations to 6 or round every estimate to an integer.

| Contextual example | Recommended impact |
| --- | --- |
| Reading Wikipedia without changing state | No external-action record. |
| Opening an email whose only effect is marking it read | 0 |
| Routine confirmation | 1 |
| Emailing an export | 1-2 |
| Action concerning an important customer | 2-3 |
| Creating a significant obligation | 3-4 |
| Extensive irreversible intervention | 4-6, and higher when justified. |

These are calibration examples, not fixed operation-type scores. Store the contextual reason and actual methodology provenance with the estimate.

**Unknown** is not impact 0. Preserve it explicitly when a defensible estimate/methodology is unavailable. Unknown actions remain visible under the default cutoff. A mixed group exposes its known subtotal plus unknown count/incompleteness. With all members unknown there is no numeric total; an empty group also has no impact, not impact 0.

## Aggregation

For a set `G` of distinct logical actions with known impacts:

```text
I_G = log10(sum(10^I_a for a in G))
```

Use this formula for inherent batches, tasks and executing agents. Distinct recipients/actions contribute separately; technical retries of one logical action do not. Never add a batch's weight alongside its members. Attribution/membership must not make an action appear twice in an ancestor total. Preserve unrounded intermediate weights/scores: the same action set has the same result through any grouping path. Round only for display.

| Members | Aggregate impact |
| --- | ---: |
| 10 actions of impact 1 | 2 |
| 100 actions of impact 1 | 3 |
| 1,000 actions of impact 1 | 4 |
| 10 actions of impact 0 | 1 |
| One impact 3 plus ten impact 1 | `log10(1100)`, about 3.041393 |

For large ranges use a stable logarithmic sum: choose `m = max(I_a)` and compute `m + log10(sum(10^(I_a-m)))`. Avoid overflow/underflow, integer clamping and material rounding differences. With unknown members, this gives the **known subtotal only**, not an estimate of missing weights.

Default visibility is aggregate **impact >= 1**. Apply cutoff after aggregation, never by dropping low-impact members first. Outcome does not reduce weight or priority. Show all and ungrouping are independent controls.

## Priority and aging

Saved impact remains unchanged. Smart order adds separate decaying priority with **30 elapsed days per impact point**:

```text
P_a(now) = I_a - age_a(now) / (30 days)
P_G(now) = log10(sum(10^(I_a - age_a(now)/(30 days)) for a in G))
```

Thirty days is a duration, not a calendar month. Use the logical action's recorded time, retaining attempt/effect times; never substitute task completion, cache rebuild or viewer-open time. A 30-day-old impact-4 action ties a fresh impact-3 action. Equal-age/impact successful and failed operations tie.

Age **each member before summing**. A fresh small member must not renew an agent/task's whole history. Total impact and current priority are different quantities. Cutoff uses total impact even when priority becomes negative. Unknown scores remain explicitly unknown and mixed subtotals incomplete.

Cached priorities must remain current without rescanning history per render. An aggregate may retain weights relative to a reference instant; advancing the clock subtracts the common elapsed-time decay. Source changes invalidate relevant aggregates. This optimization cannot alter the formula or saved impact.

## Acceptance outcomes

Verify numeric examples, fractional estimates and scores above 6. Aggregate the same actions directly and through batch/task/agent partitions with the same unrounded result. Test very large/old values, empty and unknown-only/mixed sets, and no double counting after retries/regrouping.

Verify post-aggregation cutoff, visible unknowns and complete member drill-down. Verify the 30-day tie, outcome independence, unchanged saved impact and aging before group aggregation. Deleting summary caches changes neither totals nor methodology evidence; later knowledge releases never silently rescore history.
