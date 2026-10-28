# Raw usage, attribution and cost views

[Main specification](../_main.md) · [Traces](traces.md) · [Harness adapters](harness-plugins.md) · [Storage and Git](storage-and-git.md)

The priority is faithful durable primary data, not an elaborate current dashboard. Record the finest usage actually exposed by each harness/tool, so future interfaces and calculations can improve without repeating work. Preserve raw usage independently of both price lists and derived totals.

## Capture and storage

Save structured usage records separately from readable harness output, video and other evidence in the same work's evidence area. Task records use `traces/<task-file-basename>/`, for example a versioned-schema `usage.jsonl`, with the existing occurrence/attempt boundaries. Chat-only and system work retain their own explicit source/work attribution; never invent a task merely to store usage. Capture task execution, chat, routing, discovery, teaching, repairs, retries and TEAM consultations, including failed/interrupted attempts where usage is available.

Retain available provider-native usage fields together with normalized values and provenance:

- observation time and actual consumption time/interval, with timezone/offset and time precision;
- input/output tokens and separately exposed cached input, cache writes, reasoning or other provider categories, retaining units and category semantics;
- actual model/version, harness variant and named tool instance, including tools that themselves incur model usage;
- nonsecret account context and billing mode: subscription, metered API or unknown;
- source Book/revision, occurrence, attempt and consultation/work correlation;
- whether a value is provider-reported, derived, estimated, unavailable or incomplete.

Unknown is not zero. Do not invent categories/models a provider did not report or assume reasoning/cache counts are additional to totals when they are included already. Preserve whether observations are incremental events or cumulative snapshots, their scope and safe correlation, so stream updates plus a final total do not charge the same work twice. Redact secret fields before storage; preserving raw usage does not authorize storing credentials or hidden reasoning.

Raw records are durable evidence, not a replaceable cache. Usage Git inclusion follows `traces.isCommitted` by default and the same explicit no-commit policy as other traces. Rebuildable indexes and aggregates may live in ignored `.ptbk/` cache. Retain raw records when recalculating costs or changing views.

## Work ownership and induced usage

Distinguish the executing agent, owner of the work, initiating user/agent, work kind and parent/root work links. Use normal named task/chat/agent references plus occurrence/attempt context; correlation metadata is not another entity-ID system. Retain project, tool, harness, model and account dimensions even when today's UI does not expose all of them.

An agent's own usage is the work it executed. Its inclusive usage may also include the work it initiated, such as a specialist consultation, delegated task or repair. The specialist still has that consumption in its own view. Inclusive views overlap and must not be summed to obtain a project total: each underlying consumption event contributes exactly once to that total. Keep links sufficient to reconstruct the chain without copying child usage into a parent's raw consumption.

Support aggregation/filtering by agent, task, chat, work kind, tool, harness, model, account, project and time, including combinations, and self-only versus inclusive scope. Distinguish execution from initiating/owning work. A missing attribution is explicit rather than guessed from whichever dashboard page is open.

## Independent price-list observations

Each harness adapter can fetch its current price list at the time of the request and save a timestamped observation under ignored `.ptbk/pricing/`. Keep successive observations/history, provenance, currency, units and category rates, plus effective dates/ranges when the source supplies them. An observation timestamp is not proof of when an earlier price changed.

Price lists and usage are independent datasets. Do not pin each usage record to a price-list record or replace raw consumption with a monetary total. The calculation/view layer intersects usage time, model, billing mode and applicable rate information.

Use the price valid when the consumption happened. A Wednesday reduction must not reprice Tuesday's consumption. Corrected evidence about Tuesday's rate can support a corrected later calculation without changing the raw usage. Missing historical rates can yield a labelled estimate, never a claim that today's quote was certainly valid then.

Keep this simple: fetching and retaining current observations is sufficient now. Do not add a historical crawler, automatic backfill/repricing jobs, notification workflow or complex price-revision engine. An unavailable price fetch does not discard usage or stop otherwise authorized work.

## Subscription and certainty

Billing mode and certainty are separate visible properties. Distinguish provider-reported billed cost, a calculated/estimated API cost, subscription usage and unknown billing. Token counts alone do not prove the fraction of a subscription's allowance consumed; preserve genuine quota/window measurements where available and label estimates or missing information honestly.

A useful estimate is preferable to an empty cost view when supported by available data. Mark it clearly as estimated/uncertain; incomplete coverage cannot appear to be an exact complete total. Do not display missing usage as zero. A token-price equivalent for subscription work is an explicitly labelled equivalent, not a new API charge or an allocated subscription invoice. Mixed totals retain subscription/API and known/estimated/unknown distinctions.

## Lightweight dashboard

Add a Usage tile and simple full page, using the shared nested tile/navigation contract. Default to a seven-day summary and allow useful breakdowns, initially simple views over the retained dimensions. Last view/filter choice may be remembered as local presentation state, not a committed project setting. A comprehensive analytics UI is not a prerequisite for capturing complete data.

Show labels appropriate to the selected grouping: harness names in a harness breakdown, agents in an agent breakdown, and no forced harness column in an all-work aggregate. Detail can expose relevant provenance. Keep price-list timestamps/versions and other technical rate internals hidden in the current UI; billing mode and certainty must remain visible, including at aggregate level.

Terminal/browser/API views derive consistent results through shared engine operations. Opening a view does not mutate consumption, trigger paid probes or require a new collection service. Future richer interfaces must be able to use the raw records without depending on today's dashboard or cache layout.

## Acceptance outcomes

Record a chat, task, retry, routing call and specialist consultation with differing models/tools/accounts and unavailable fields. Preserve fine provider observations, cumulative/delta semantics and attempt/time provenance; rebuild without counting streamed/final snapshots twice. Verify executing/owner/initiator attribution and self/inclusive views: consultant and parent views overlap, project total counts each event once.

Capture Tuesday usage, then a cheaper Wednesday list: Tuesday keeps Tuesday's rate. Supply corrected historical Tuesday pricing and recalculate without editing consumption or invoking an automatic backfill mechanism. Test failed price retrieval, missing historical coverage and provider-native token categories. Subscription quantities never silently become API charges or precise quota percentages. Every estimate/partial total is marked; technical price versions stay hidden.

Toggle trace Git policy and rebuild an ignored aggregate cache from durable raw usage and independent price observations. View by agent, harness and aggregate with appropriate labels; opening or changing the dashboard never manufactures usage.
