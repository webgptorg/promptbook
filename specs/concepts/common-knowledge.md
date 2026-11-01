# Shared common-knowledge Books

[Adam](../agents/core-agents/adam.md) · [Expert](../agents/expert.md) · [Inheritance](../book-language/inheritance.md) · [KNOWLEDGE](../book-language/commitments/knowledge.md) · [Engine and project evolution](engine-and-project.md)

## Purpose and ownership

Publish reusable recommended knowledge/rulesets as public UTF-8 Books under **`https://ptbk.io/book`**. The readable index lists topic, purpose, current release and reading/source links. The first topic is [external-action impact](external-action-impact.md); no catalogue of unfinished topics or separate publishing platform is needed.

Init materializes editable core Books; users then customize them. Retaining a reference to shared knowledge lets a project keep its own rules while receiving improvements without continually rewriting that core Book. A user may instead replace/remove the link, pin a release, copy the content into local knowledge and edit it, or host a fork. Preserve those choices during reinit, template reconciliation and upgrades. Linked knowledge cannot expand tool/account/spending authority or weaken local constraints.

## Public URL and release contract

| URL | Meaning |
| --- | --- |
| `/book` | Readable common-knowledge index. |
| `/book/external-action-impact` | Readable topic page with purpose, release, source and usage. |
| `/book/external-action-impact.book` | Stable machine-readable latest recommended release. |
| `/book/external-action-impact/1.0.0.book` | Immutable first release. |

Each ruleset has its **own release version/history**, independent of the engine package, `ptbk.json.promptbookVersion`, project migrations and other rulesets. Initial impact release is `1.0.0`; edits publish a new release while preserving old bytes/URLs. The stable URL can advance without an engine release; an engine release need not change knowledge. Knowledge will often outlive many engine versions. Never overwrite released content under the same version.

Serve direct UTF-8 text with a plain-text content type, without login, HTML wrapping, locale negotiation or JavaScript. Permit public cross-origin retrieval. Revalidate the latest alias with short bounded caching/content identity; immutable versions may have long immutable caching. Unknown topics/versions return a real 404, never a homepage or latest version in disguise. Readable pages do not replace source addresses.

Use committed content and a small catalogue in the existing landing repository/deployment. No engine-release dependency, new subdomain, publication service, user-upload flow or automated publishing pipeline is needed now.

## Inherited use and customization

The intended project Adam contains its normal foundation plus, illustratively:

```book
AGENT Adam
FROM @Void
KNOWLEDGE https://ptbk.io/book/external-action-impact.book
RULE When evaluating an external action, estimate its impact using the referenced external-action impact methodology and the action's actual context.
CLOSED
```

This is an excerpt, not permission to replace customized Adam or remove other rules. `KNOWLEDGE` makes the source available; RULE specifies **when to apply it**. A shared resource can be a valid Book containing RULE/KNOWLEDGE and release notes. Loading it as knowledge is not executing, registering or scheduling another agent. Preserve the distinction from IMPORT, which composes a project agent in place. No new commitment keyword or Book entity kind is introduced.

Ordinary agents inherit project Adam. The engine-owned Expert also inherits **that same project's Adam**, then adds version-matched engine expertise. Teacher's normal `FROM @Expert` receives Adam transitively. Composition is referenced common knowledge -> project Adam -> internal Expert -> Teacher/local specialization, with source attribution and ordinary constraints. Different project Adams produce different effective Experts on the same engine. Shared-source rules do not become privileged engine instructions.

Deliberate `FROM @Void`/`@Null`, altered ancestry or a replaced/removed source is an explicit opt-out. Diagnose cycles, including Adam inheriting Expert that itself inherits Adam; do not bypass project Adam to conceal a cycle.

## Resolution, availability and evaluation provenance

Load applicable remote knowledge through ordinary authorized context resolution with a cached snapshot. Retain URL, resolved release, content hash and fetched time/availability. Revalidate the latest URL independently of engine releases at bounded refresh boundaries; do not fetch once per action, require the website for every request or change an active evaluation's rules halfway through it. Immutable pins stay pinned. Reuse verified cached content during outages and expose its provenance. Missing/unusable knowledge is explicit, never a claim that latest rules were applied. Do not replace a user's source silently or turn retrieval failure into impact 0.

### Evaluation provenance

Each impact estimate retains effective methodology URL/release/content identity and relevant local overrides/Book revision. Local/inline forks retain their own source/revision/hash rather than claiming an unchanged upstream release. This evidence belongs to the durable action record, not disposable summary cache. Retain the needed nonsecret evaluated content or a durable local reference so remote edits/removal do not erase audit evidence.

New recommended releases affect subsequent evaluations when resolved. They do **not** silently rewrite historical impact/rationale/evidence or existing core Books. Explicit reassessment must be separately attributable and preserve the original estimate. Rebuilding derived aggregates uses saved records without model calls or semantic re-evaluation.

## Possible paid knowledge

The shared space may later offer improved premium knowledge for paying customers, with its own entitlement policy and release cycle. This is future scope, not an existing paid offer or billing requirement. Preserve a useful public default and user-owned replacement/pinning. Do not implement payments, protected premium endpoints or an account system now, or put future credentials in committed Book URLs. Premium knowledge would still not bypass project rules.

## Acceptance outcomes

Open index/topic pages and retrieve latest/immutable `.book` bytes anonymously and cross-origin. Verify real 404s, version identity, caching and identical latest/version bytes for the selected release. Publish knowledge independently and preserve prior releases.

Customize Adam while keeping its link, then update knowledge without rewriting Adam. Exercise source replacement/removal, inline edits and pins through reinit/reconciliation. Resolve Expert/Teacher in projects with different Adams. Handle opt-out, cycles, missing sources and cached offline use honestly. New releases cannot silently change historical impact or require a new engine release.
