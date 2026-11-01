# KNOWLEDGE

[Commitments](_index.md) · [Syntax](../syntax.md)

**Document:** Agent.

Provides inline knowledge or a reference to relevant project/external material. Make appropriate evidence available to the agent without requiring every source to be loaded into every request. Source availability and authorization remain real constraints; a URL does not grant access. See [browser context](../../cli/browser.md) and [Expert](../../agents/expert.md).

Recommended reusable sources live in the public [common-knowledge catalogue](../../concepts/common-knowledge.md) at `https://ptbk.io/book`. For example, `KNOWLEDGE https://ptbk.io/book/external-action-impact.book` references the independently released impact ruleset. Resolve UTF-8 Book content as knowledge, not an additional registered/executed agent or another FROM parent. An accompanying short RULE states when to apply it; KNOWLEDGE alone is not an automatic mandate to use every fact on every operation.

Inherit knowledge through ordinary project Adam -> internal Expert -> Teacher chains. Users can replace/remove the source, pin an immutable release, or inline/copy/edit it. Preserve source URL/release/hash and local overrides where an evaluation relies on it. Cache/revalidate independently of engine releases and retain honest missing/stale availability; later source edits do not rewrite historical evaluations. See the shared knowledge contract for durable evaluation evidence and future premium scope.
